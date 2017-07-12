const callOrderDebug = false;

let reconciler = {
  old: {},
};

////////////////////////////////////////////////////////
/////////////////////   MAIN   /////////////////////////
////////////////////////////////////////////////////////

function render(gl, program, components){

  // program should probably be added to components, honestly
  gl.useProgram(program)

  // route components
  const updated = components.map((component) => {

    switch(component.type) {
      case 'attribute':
        callOrderDebug && console.log(`${component.name} in switch.`);
        return renderAttribute(component, program, gl);

      case 'uniform':
        callOrderDebug && console.log(`${component.name} in switch.`);
        return renderUniform(component, program, gl);

      case 'element_arr':
        callOrderDebug && console.log('element_arr in switch.');
        return renderElementArray(component, program, gl);

      case 'draw':
        callOrderDebug && console.log('draw in switch.');
        return drawIt(component, program, gl);

      default:
        console.error('Cannot render component of type:', component.type);
    }
  });

  reconciler.old = Object.assign(reconciler.old, ...updated.filter(Boolean));

}

////////////////////////////////////////////////////////
///////////////   RENDER/RECONCILE   ///////////////////
////////////////////////////////////////////////////////

// ------------------- ATTRIBUTE ------------------------

function renderAttribute(component, program, gl) {

  if (hasNotChanged(component)){
    return null;
  }

  if(isNew(component)){
    const location = gl.getAttribLocation(program, component.shaderVar);
    gl.enableVertexAttribArray(location);
    component.location = location;
    component.pointer.unshift(component.location);
  }

  // there is no else here, as there is in the immutablejs example because the data
  // in this component has been updated in draw and it will get copied for diffing
  // after this main map call

  callOrderDebug && console.log(component.name + ' render finished');
  bindAndSetArray(component, gl, gl.ARRAY_BUFFER);

  // it is when we return an object literal like this that we sever the reference connection
  // and thus do not have nothing ever change
  return { [component.name]: component };
}

// ------------------- UNIFORM ------------------------

function renderUniform(component, program, gl) {

  if (hasNotChanged(component)){
    return null;
  }

  if(isNew(component)){
    const location = gl.getUniformLocation(program, component.shaderVar);
    component.location = location;
    component.data.unshift(component.location);
  }

  setUniform(component, gl);
  callOrderDebug && console.log('uniform render finished');
  return { [component.name]: component };
}

// ------------------- ELEMENT ARRAY ------------------------

function renderElementArray(component, program, gl) {

  if (hasNotChanged(component)){
    return null;
  }

  if(isNew(component)){
    const location = gl.getAttribLocation(program, component.name);
    component.location = location;
  }

  bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
  callOrderDebug && console.log('elem render finished');
  return { [component.name]: component };
}

// ------------------- DRAW ------------------------

function drawIt(component, program, gl) {

  // draw is always called
  component.drawCall.apply(gl, component.data);
  callOrderDebug && console.log('draw finished');

  // so we don't need to save it
  return null;
}

////////////////////////////////////////////////////////
////////////////////   HELPERS   ////////////////////////
////////////////////////////////////////////////////////

// ------------------- GL BUFFER CALLS ------------------------

function bindAndSetArray (component, gl, bufferType){
  let buffer = gl.createBuffer();
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, component.data, gl.STATIC_DRAW);
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.pointer);
}

function setUniform(component, gl){
  gl[component.dataType].apply(gl, component.data);
}

// ------------------- DIFFING FNS ------------------------

function isNew(component) {
  // this only works across the barrier *beacause* these objects are passed by reference
  // and we can therefore breach the barrier between drawing file and renderer
  return !component.hasOwnProperty('location');
}

function hasNotChanged(component) {
  const oldComponent = reconciler.old[component.name];


  if (component.rerender || !oldComponent) {
    return false;
  }

  // this cannot just test component because in this case we draw the mutability division where we store elements
  return (oldComponent.name === component.name) && arraysEqual(oldComponent.data, component.data);
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