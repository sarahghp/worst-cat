let callOrderDebug = false;

let reconciler = Map({
  old: {},
});

// main

function render(gl, program, components){

  // let oldKeys = Object.keys(reconciler.old);

  // turrn componenets into Immutable Map if not already
  !Map.isMap(components) && Map(components);

  // check to see if nothing has changed; this will only work if the deep structures
  // have been wrapped as Immutable collections
  if components.equals(reconciler) {
    return;
  }


  // program should probably be added to components, honestly
  gl.useProgram(program)

  // route components
  let updated = components.map((component, index) => {

    switch(component.type) {
      case 'attribute':
        callOrderDebug && console.log(`${component.name} in switch.`);
        return renderAttribute(component, index, program, gl);

      case 'uniform':
        callOrderDebug && console.log(`${component.name} in switch.`);
        return renderUniform(component, index, program, gl);

      case 'element_arr':
        callOrderDebug && console.log('element_arr in switch.');
        return renderElementArray(component, index, program, gl);

      case 'draw':
        callOrderDebug && console.log('draw in switch.');
        return drawIt(component, index, program, gl);

      default:
        console.log(component);
        console.error('Cannot render component of type:', component.type);
    }
  });

  // if(oldKeys.length > updated.length) {
  //   unsetKeys(_.difference(oldKeys, updated));
  // }
}

// renderers/reconcilers

// function unsetKeys (keys) {
//   return _.map(keys, (key) => _.unset(reconciler.old, key))
// }

function renderAttribute(component, index, program, gl) {
  if(isNew(component)){
    // if it is new, we do all the things: create location, enable, bind data, then we're done
    let location = gl.getAttribLocation(program, component.name);
    gl.enableVertexAttribArray(location);
    component.location = location;
    component.pointer.unshift(component.location);
    reconciler.old[component.name] = Object.assign(component);
    bindAndSetArray(component, gl, gl.ARRAY_BUFFER);
    callOrderDebug && console.log(component.name + ' render finished');
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  let oldComponent = reconciler.old[component.name];

  if (oldComponent && (oldComponent.name === component.name) && arraysEqual(oldComponent.data, component.data)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    bindAndSetArray(component, gl, gl.ARRAY_BUFFER);
    oldComponent = component;
  }

  callOrderDebug && console.log(component.name + ' render finished');
  return component.name;
}

function renderUniform(component, index, program, gl) {
  // if it is new, we do all the things: create location, enable, bind data, then we're done
  if(isNew(component)){
    let location = gl.getUniformLocation(program, component.name);
    component.location = location;
    component.data.unshift(component.location);
    reconciler.old[component.name] = Object.assign(component);
    setUniform(component, gl);
    callOrderDebug && console.log('uniform render finished');
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  let oldComponent = reconciler.old[component.name];

  if (oldComponent && (oldComponent.name === component.name) && arraysEqual(oldComponent.data, component.data)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    component.data.unshift(component.location);
    setUniform(component, gl);
    oldComponent = component;
  }

  callOrderDebug && console.log('uniform render finished');
  return component.name;
}

// TODO: Combine with render attribute?
function renderElementArray(component, index, program, gl) {
  if(isNew(component)){
    // if it is new, we do all the things: create location, enable, bind data, then we're done
    let location = gl.getAttribLocation(program, component.name);
    component.location = location;
    reconciler.old[component.name] = Object.assign(component);
    bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
    callOrderDebug && console.log('elem render finished');
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  let oldComponent = reconciler.old[component.name];

  if (oldComponent && (oldComponent.name === component.name) && arraysEqual(oldComponent.data, component.data)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
    oldComponent = component;
  }
  callOrderDebug && console.log('elem render finished');
  return component.name;
}

function drawIt(component, index, program, gl) {
  // draw is always called
  reconciler.old[component.name] = Object.assign(component);
  component.drawCall.apply(gl, component.data);
  callOrderDebug && console.log('draw finished');

  return component.name;
}

// Helpers

function isNew(component) {
  return !component.hasOwnProperty('location');
}

function bindAndSetArray (component, gl, bufferType){
  let buffer = gl.createBuffer();
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, component.data, gl.STATIC_DRAW);
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.pointer);
}

function setUniform(component, gl){
  gl[component.dataType].apply(gl, component.data);
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
