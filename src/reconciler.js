var reconciler = {
  old: {},
}

// main

function render(gl, program, components){

  let oldKeys = Object.keys(reconciler.old);

  // program should probably be added to components, honestly
  gl.useProgram(program)

  // route components
  const updated = _.map(components, (component, index) => {

    switch(component.type) {
      case 'attribute':
        return renderAttribute(component, index, program, gl);

      case 'uniform':
        return renderUniform(component, index, program, gl);

      case 'element_arr':
        return renderElementArray(component, index, program, gl);

      case 'draw':
        return drawIt(component, index, program, gl);

      default:
        console.log(component);
        console.error('Cannot render component of type:', component.type);
    }
  });

}

// renderers/reconcilers

function renderAttribute(component, index, program, gl) {
  if(isNew(component)){
    // if it is new, we do all the things: create location, enable, bind data, then we're done
    const location = gl.getAttribLocation(program, component.name);
    gl.enableVertexAttribArray(location);
    component.location = location;
    component.pointer.unshift(component.location);
    reconciler.old[component.name] = _.cloneDeep(component);
    bindAndSetArray(component, gl, gl.ARRAY_BUFFER);
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  let oldComponent = reconciler.old[component.name];

  if (_.isEqual(oldComponent, component)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    bindAndSetArray(component, gl, gl.ARRAY_BUFFER);
    oldComponent = component;
  }

  return component.name;
}

function renderUniform(component, index, program, gl) {
  // if it is new, we do all the things: create location, enable, bind data, then we're done
  if(isNew(component)){
    const location = gl.getUniformLocation(program, component.name);
    component.location = location;
    component.data.unshift(component.location);
    reconciler.old[component.name] = _.cloneDeep(component);
    setUniform(component, gl);
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  const oldComponent = reconciler.old[component.name];

  if (_.isEqual(oldComponent, component)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    component.data.unshift(component.location);
    setUniform(component, gl);
    oldComponent = component;
  }

  return component.name;
}

// TODO: Combine with render attribute?
function renderElementArray(component, index, program, gl) {
  if(isNew(component)){
    // if it is new, we do all the things: create location, enable, bind data, then we're done
    const location = gl.getAttribLocation(program, component.name);
    component.location = location;
    reconciler.old[component.name] = _.cloneDeep(component);
    bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
    return component.name;
  }

  // otherwise check if we need to diff and act on that
  const oldComponent = reconciler.old[component.name];

  if (_.isEqual(oldComponent, component)){
    // deep equality check means it is same name & data
  } else {
    // if it made it through the new check, the location has been set and it exists
    bindAndSetArray(component, gl, gl.ELEMENT_ARRAY_BUFFER);
    oldComponent = component;
  }
  return component.name;
}

function drawIt(component, index, program, gl) {
  // draw is always called
  reconciler.old[component.name] = _.cloneDeep(component);
  component.drawCall.apply(gl, component.data);

  return component.name;
}

// Helpers

function isNew(component) {
  return !(_.has(component, 'location'));
}

function bindAndSetArray (component, gl, bufferType){
  const buffer = gl.createBuffer();
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, component.data, gl.STATIC_DRAW);
  bufferType === gl.ARRAY_BUFFER && gl.vertexAttribPointer.apply(gl, component.pointer);
}

function setUniform(component, gl){
  gl[component.dataType].apply(gl, component.data);
}
