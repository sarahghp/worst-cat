const iMap = Immutable.Map;
const iList = Immutable.List;

// let callOrderDebug = false;
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
        // callOrderDebug && console.log(`${component.get('name')} in switch.`);
        return renderAttribute(component, index, program, gl);

      case 'uniform':
        // callOrderDebug && console.log(`${component.get('name')} in switch.`);
        return renderUniform(component, index, program, gl);

      case 'element_arr':
        // callOrderDebug && console.log('element_arr in switch.');
        return renderElementArray(component, index, program, gl);

      case 'draw':
        // callOrderDebug && console.log('draw in switch.');
        return drawIt(component, index, program, gl);

      default:
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
          .update('pointer', (p) => p.size < 6 ? p.unshift(location) : p);
    });

  } else {
    updatedComponent = component;
  }

  bindAndSetArray(updatedComponent, gl, gl.ARRAY_BUFFER);
  // callOrderDebug && console.log(componentName + ' render finished');

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

  setUniform(updatedComponent, gl);
  // callOrderDebug && console.log('uniform render finished');
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
  // callOrderDebug && console.log('elem render finished');
  return { [componentName]: updatedComponent };

}

function drawIt(component, index, program, gl) {
  // draw is always called
  const drawCall = component.get('drawCall');
  console.log(component.get('data').toArray());
  drawCall.apply(gl, component.get('data').toArray());
  // callOrderDebug && console.log('draw finished');

  // so we don't need to track it
  return null;
}

////////////////////////////////////////////////////////
////////////////////   HELPERS   ////////////////////////
////////////////////////////////////////////////////////

function hasNotChanged (component) {
  const componentData = component.get('data');
  const componentName = component.get('name');
  const reconcilerComp = reconciler.get(componentName);
  const reconcilerData = reconciler.getIn(componentName, 'data')
  const noChange = !!(reconcilerComp && reconcilerData.equals(componentData));
  console.log(noChange);
  return noChange;
}

function isNew(component) {
  const yes = !reconciler.has(component)
  console.log(yes, 'is new');
  return yes;
}

function bindAndSetArray (component, gl, bufferType){ // 3.0% overall, 76.5% @1000 cubes
  const buffer = gl.createBuffer();
  const data = getData(component); // moving this out of bufferData helps performance a little?
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, data, gl.STATIC_DRAW); // 0.8% overall
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.get('pointer').toArray());
}

// function bindAndSetArray (component, gl, bufferType){ // 2.7% overall, 76.5% @1000 cubes
//   const buffer = gl.createBuffer();
//   gl.bindBuffer(bufferType, buffer);
//   gl.bufferData(bufferType, component.get('data'), gl.STATIC_DRAW); //0.9% overall, 0.4ms, 0.6ms, 0.3ms
//   bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.get('pointer'));
// }

function getData (component) {
  return component.get('data').toArray();
}

function setUniform(component, gl){
  console.log(component.get('data').toArray());
  gl[component.get('dataType')].apply(gl, component.get('data').toArray());
}
