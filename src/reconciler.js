const iMap = Immutable.Map;
const iList = Immutable.List;

let callOrderDebug = false;
let reconciler = iMap({});

////////////////////////////////////////////////////////
/////////////////////   MAIN   /////////////////////////
////////////////////////////////////////////////////////

function render(gl, program, components){ // components is a single list of maps

  // turn componenets into Immutable List if not already
  let immComponents =  !iList.isList(components) ? iList(components) : components;

  // TODO: figure out how to check with reconciler being mutable
  // check to see if nothing has changed; this will only work if the deep structures
  // have been wrapped as Immutable collections
  if (immComponents.equals(reconciler)) {
    return;
  }

  // program should probably be added to components, honestly
  gl.useProgram(program)

  // route components
  const updated = immComponents.map((component, index) => {

    switch(component.get('type')) {
      case 'attribute':
        callOrderDebug && console.log(`${component.get('name')} in switch.`);
        return renderAttribute(component, index, program, gl);

      case 'uniform':
        callOrderDebug && console.log(`${component.get('name')} in switch.`);
        return renderUniform(component, index, program, gl);

      case 'element_arr':
        callOrderDebug && console.log('element_arr in switch.');
        return renderElementArray(component, index, program, gl);

      case 'draw':
        callOrderDebug && console.log('draw in switch.');
        return drawIt(component, index, program, gl);

      default:
        console.log(component);
        console.error('Cannot render component of type:', component.get('type'));
    }
  });

  // this might be interesting to talk about, the choice to use a global state
  // and also the difference between a value and an identity
  reconciler = reconciler.withMutations((oldRec) => {
      oldRec.merge(...updated.filter(Boolean));
  });

  // if(oldKeys.length > updated.length) {
  //   unsetKeys(_.difference(oldKeys, updated));
  // }
}

////////////////////////////////////////////////////////
///////////////   RENDER/RECONCILE   ///////////////////
////////////////////////////////////////////////////////

function renderAttribute(component, index, program, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  // if it is new, we do all the things: create location, enable, bind data, then we're done
  if(isNew(component)){
    const location = gl.getAttribLocation(program, componentName);
    gl.enableVertexAttribArray(location);

    updatedComponent = component.withMutations((comp) => {
      // we add the location to the front of the pointer, which is used in the bindAndSetArray call
      comp.set('location', location)
          .update('pointer', (p) => p.length < 6 && p.unshift(location));
    });

  } else {
    updatedComponent = component;
  }

  bindAndSetArray(component, gl, gl.ARRAY_BUFFER);
  callOrderDebug && console.log(componentName + ' render finished');

  return { [componentName]: updatedComponent };
}

function renderUniform(component, index, program, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  if(isNew(component)){
    const location = gl.getUniformLocation(program, componentName);

    updatedComponent = component.withMutations((comp) => {
      // we add the location to the front of the data array, which is used in the setUniform call
      comp.set('location', location)
          .update('data', (d) => d.unshift(location))
    });

  } else {
    // overwrite data with location information again
    // TODO: Improve?
    updatedComponent = component.update('data', (d) => d.unshift(location));
  }

  setUniform(component, gl);
  callOrderDebug && console.log('uniform render finished');
  return { [componentName]: updatedComponent };
}

function renderElementArray(component, index, program, gl) {

  if (hasNotChanged(component)) {
    return null; // this way we can filter it out of the update with a Boolean
  }

  const componentName = component.get('name');
  let updatedComponent;

  // if it is new, we do all the things: create location, enable, bind data, then we're done
  if(isNew(component)){

    const location = gl.getAttribLocation(program, componentName);
    updatedComponent = component.set('location', location);

  } else {
    updatedComponent = component;
  }

  bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
  callOrderDebug && console.log('elem render finished');
  return { [componentName]: updatedComponent };

}

function drawIt(component, index, program, gl) {
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

function hasNotChanged (component) {
  return component.equals(reconciler.getIn('old', component.get('name')))
}

function isNew(component) {
  return !component.has('location');
}

function bindAndSetArray (component, gl, bufferType){
  let buffer = gl.createBuffer();
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, component.get('data'), gl.STATIC_DRAW);
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.get('pointer'));
}

function setUniform(component, gl){
  gl[component.get('dataType')].apply(gl, component.get('data'));
}

function arraysEqual (arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (var i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;

}
