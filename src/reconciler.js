const I = Immutable;

let reconciler = I.Map({});

////////////////////////////////////////////////////////
/////////////////////   MAIN   /////////////////////////
////////////////////////////////////////////////////////

function render(gl, components){ // components is a single list of maps

  // turn componenets into Immutable List if not already
  const immComponents =  !I.List.isList(components) ? I.List(components) : components;

  // Check to see if this list is the same we were last called with and short-circuit if so
  // Though it would be silly to call render() with something totally unchanged, let's just
  // be extra sure
  if (immComponents.equals(reconciler.get('unchangedList'))) {
    return;
  } else {
    reconciler.set('unchangedList', immComponents);
  }

  // route components
  const updated = immComponents.map((component) => {

    switch(component.get('type')) {
      case 'program':
        return bindProgram(component, gl);

      case 'attribute':
        return renderAttribute(component, gl);

      case 'uniform':
        return renderUniform(component, gl);

      case 'element_arr':
        return renderElementArray(component, gl);

      case 'draw':
        return drawIt(component, gl);

      default:
        console.error('Cannot render component of type:', component.get('type'));
    }
  });

  // this might be interesting to talk about, the choice to use a global state
  // and also the difference between a value and an identity
  reconciler = reconciler.withMutations((oldRec) => {
      oldRec.merge(...updated.filter(Boolean));
  });

}

////////////////////////////////////////////////////////
///////////////   RENDER/RECONCILE   ///////////////////
////////////////////////////////////////////////////////

function bindProgram(program, gl) {
  const programName = program.get('name');
  const programData = program.get('data');

  if (reconciler.get('lastUsedProgram', I.Map()).equals(program)) {
    return null;
  }

  if (isNew(programName)) {
    reconciler = reconciler.set('lastUsedProgram', program);
  }

  gl.useProgram(programData);
  return { [programName]: program }

}

// ------------------- ATTRIBUTE ------------------------

function renderAttribute(component, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  if(isNew(componentName)){
    const program = reconciler.getIn(['lastUsedProgram', 'data']);
    const location = gl.getAttribLocation(program, component.get('shaderVar'));
    gl.enableVertexAttribArray(location);

    updatedComponent = component.withMutations((comp) => {
      comp.set('location', location)
          .update('pointer', (p) => p.length < 6 && [].concat(location, p));
    });

  } else {
    // is there a way to write these elses so I am making one fewer copy?
    // does it matter? since in theory a copy is "cheap"
    const extantComponent = reconciler.get(componentName);
    const newData = component.get('data'); // this is the changed data

    updatedComponent = extantComponent.set('data', newData);
  }

  bindAndSetArray(updatedComponent, gl, gl.ARRAY_BUFFER);
  callOrderDebug && console.log(componentName + ' render finished');

  return { [componentName]: updatedComponent };
}

// ------------------- UNIFORM ------------------------


function renderUniform(component, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  if(isNew(componentName)){
    const program = reconciler.getIn(['lastUsedProgram', 'data']);
    const location = gl.getUniformLocation(program, component.get('shaderVar'));

    // we add the location to the front of the data array, which is used in the setUniform call
    updatedComponent = component.withMutations((comp) => {
      const data = comp.get('data');

      comp.set('location', location)
          .set('dataWithLocation', [].concat(location, data))
    });

  } else {

    const extantComponent = reconciler.get(componentName);
    const newData = component.get('data'); // this is the changed data

    updatedComponent = extantComponent.withMutations((extComp) => {
      const location = extComp.get('location');
      extComp.set('dataWithLocation', [].concat(location, newData));
      // data itself is set when the component overwrites in render
    });

  }

  setUniform(updatedComponent, gl);
  callOrderDebug && console.log('uniform render finished');
  return { [componentName]: updatedComponent };
}

// ------------------- ELEMENT ARRAY ------------------------

function renderElementArray(component, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  // if it is new, we do all the things: create location, enable, bind data, then we're done
  if(isNew(componentName)){
    const program = reconciler.getIn(['lastUsedProgram', 'data']);
    const location = gl.getAttribLocation(program, componentName);
    updatedComponent = component.set('location', location);

  } else {
    const extantComponent = reconciler.get(componentName);
    const location = extComp.getIn(componentName, 'location');
    updatedComponent = extComp.set('location', location);
  }

  bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
  callOrderDebug && console.log('elem render finished');
  return { [componentName]: updatedComponent };

}

// ------------------- DRAW ------------------------

function drawIt(component, gl) {
  const program = reconciler.getIn(['lastUsedProgram', 'data']);
  // draw is always called
  const drawCall = component.get('drawCall');
  drawCall.apply(gl, component.get('data'));
  callOrderDebug && console.log('draw finished');

  // so we don't need to track it
  return null;
}

////////////////////////////////////////////////////////
////////////////////   HELPERS   ////////////////////////
////////////////////////////////////////////////////////

// ------------------- GL BUFFER CALLS ------------------------

function bindAndSetArray (component, gl, bufferType){
  const buffer = gl.createBuffer();
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, component.get('data'), gl.STATIC_DRAW);
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.get('pointer'));
}

function setUniform(component, gl){
  gl[component.get('dataType')].apply(gl, component.get('dataWithLocation'));
}

// ------------------- DIFFING FNS ------------------------

function hasNotChanged (component) {
  const oldComponent = reconciler.get(component.get('name'));
  const alwaysBind = component.get('rerender');

  // components can indicate they must always be rebound even if they do not change
  // this is useful for drawing multiple shapes

  if (!(oldComponent) || alwaysBind) {
    return false;
  }

  const oldData = oldComponent.get('data');
  const newData = component.get('data');

  return oldComponent && arraysEqual(oldData, newData);
}

function isNew(componentName) {
  return !(reconciler.get(componentName));
}

function arraysEqual (arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  // is there a length at which it is not worth iterating and just returning the same thing?

  for (var i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;

}
