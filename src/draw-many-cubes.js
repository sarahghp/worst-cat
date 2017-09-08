console.log('Loaded.');
window.onload = main;

function main() {

  const I = Immutable;

  // create context
  const canvas = document.getElementById('c');
  const gl = initGL(canvas);

  const clientWidth = gl.canvas.clientWidth;
  const clientHeight = gl.canvas.clientHeight;

  // create, link, and use program
  // const program = createProgramFromScripts(gl, '3d-vertex-shader', '3d-fragment-shader');

  const program = I.Map({
    name: 'program',
    type: 'program',
    data: createProgramFromScripts(gl, '3d-vertex-shader', '3d-fragment-shader')
  });

  // geometry
  const verticesOne = [
    // Front face
    0.0,    0.0,    100.0,
    100.0,  0.0,    100.0,
    100.0,  100.0,  100.0,
    0.0,    100.0,  100.0,

    // Back face
    0.0,    0.0,    0.0,
    0.0,    100.0,  0.0,
    100.0,  100.0,  0.0,
    100.0,  0.0,    0.0,

    // Top face
    0.0,    100.0,  0.0,
    0.0,    100.0,  100.0,
    100.0,  100.0,  100.0,
    100.0,  100.0,  0.0,

    // Bottom face
    0.0,    0.0,    0.0,
    100.0,  0.0,    0.0,
    100.0,  0.0,    100.0,
    0.0,    0.0,    100.0,

    // Right face
    100.0,    0.0,  0.0,
    100.0,  100.0,  0.0,
    100.0,  100.0,  100.0,
    100.0,    0.0,  100.0,

    // Left face
    0.0,    0.0,    0.0,
    0.0,    0.0,    100.0,
    0.0,  100.0,    100.0,
    0.0,  100.0,    0.0
  ];

  const verticesTwo = [
    // Front face
    0.0,    0.0,    50.0,
    100.0,  0.0,    50.0,
    100.0,  100.0,  100.0,
    0.0,    100.0,  100.0,

    // Back face
    0.0,    0.0,    0.0,
    0.0,    100.0,  0.0,
    50.0,  50.0,  0.0,
    100.0,  0.0,    0.0,

    // Top face
    0.0,    100.0,  0.0,
    0.0,    100.0,  100.0,
    100.0,  100.0,  100.0,
    100.0,  100.0,  0.0,

    // Bottom face
    0.0,    0.0,    0.0,
    100.0,  0.0,    0.0,
    100.0,  0.0,    100.0,
    0.0,    0.0,    100.0,

    // Right face
    100.0,    0.0,  0.0,
    50.0,  50.0,  0.0,
    100.0,  100.0,  100.0,
    100.0,    0.0,  100.0,

    // Left face
    0.0,    0.0,    0.0,
    0.0,    0.0,    100.0,
    0.0,  50.0,    50.0,
    0.0,  100.0,    0.0
  ];

  let positionOne = I.Map({
    type: 'attribute',
    shaderVar: 'a_position',
    name: 'positionOne',
    data: new Float32Array(verticesOne),
    pointer: [3, gl.FLOAT, false, 0, 0],
    rerender: false
  });

  let positionTwo = I.Map({
    type: 'attribute',
    shaderVar: 'a_position',
    name: 'positionTwo',
    data: new Float32Array(verticesTwo),
    pointer: [3, gl.FLOAT, false, 0, 0],
    rerender: false
  });

  const cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];

  let cubeVertexIndex = I.Map({
    type: 'element_arr',
    name: 'e_indices', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    data: new Uint16Array(cubeVertexIndices),
  });
  // matrix
  const initialMatrix = I.Map({
    translation  : [clientWidth/3, clientHeight/3, 40],
    rotation     : [1, 1, 1],
    scale        : [1, 1, 1],
  });

  let multiMatrixList = I.List(Array(10).fill(0).map(() => {
    return initialMatrix.withMutations((initMat) => {
      initMat.set('translation', [Math.random() * 1000, Math.random() * 1000, Math.random() * 40]);
      initMat.set('rotation', [Math.random() * 7.28, Math.random() * 7.28, 1]);
      initMat.set('scale', [1, 1, 1]);
    })
  }));

  let transformMatrix = I.Map({
    type: 'uniform',
    name: 'u_matrix',
    shaderVar: 'u_matrix',
    data: [],
    dataType: 'uniformMatrix4fv'
  });

  // color
  const colors = generateColors();

  let color = I.Map({
    type: 'attribute',
    name: 'a_color',
    shaderVar: 'a_color',
    data: new Float32Array(colors),
    pointer: [4, gl.FLOAT, false, 0, 0]
  });

  // draw
  let draw = I.Map({
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawElements,
    data: [gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0]
  })


  // animate
  function animateCube(gl, components, matrixList){

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // have to get updated values, create new transform data, set that data, generate components, call

    // Create matrices
    const updatedMatrices = matrixList.map((mat) => {
      return mat.update('rotation', (rot) => rot.map( (r, i) => r += (.01 * i) ));
    });

    const updatedComponents = updatedMatrices.map((updatedMatrix, idx) => {

      const rotation = updatedMatrix.get('rotation')
      const translation = updatedMatrix.get('translation');
      const scale = updatedMatrix.get('scale');

      // Compute the matrix
      let matrix = m4.projection(clientWidth, clientHeight, 400);
          matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
          matrix = m4.xRotate(matrix, rotation[0]);
          matrix = m4.yRotate(matrix, rotation[1]);
          matrix = m4.zRotate(matrix, rotation[2]);
          matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

      return transformMatrix.withMutations((tm) => {
        tm.set('data', [false, matrix])
          .update('name', (n) => `${n}-${idx}`)
      });
    });


    // Add into draw sequence

    const totalComponents = updatedComponents.size;
    const midwayComponent = Math.floor(totalComponents/2);

    const updatedSequence = updatedComponents.flatMap((updatedComp, idx) => {

      let position;

      if (idx == 0) {
        position = positionOne.set('rerender', true);
      } else if (idx < midwayComponent) {
        position = positionOne;
      } else if (idx == midwayComponent) {
        position = positionTwo.set('rerender', true);
      } else {
        position = positionTwo;
      }

      return [components[0], position, components[2], updatedComp, components[4], components[5]];
    });

    // Call render & animate
    render(gl, updatedSequence); // spread nested return array
    requestAnimationFrame(animateCube.bind(null, gl, components, updatedMatrices));
  }

  var drawUs = [program, positionOne, cubeVertexIndex, transformMatrix, color, draw];
  requestAnimationFrame(animateCube.bind(null, gl, drawUs, multiMatrixList));

}


function initGL(canvas) {
  const gl = canvas.getContext('webgl');

  if (!gl) {
   console.log('Wat, no gl.');
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  return gl;
}
