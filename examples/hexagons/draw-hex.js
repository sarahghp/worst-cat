console.log('Loaded.');
window.onload = main;

function main() {

  // create context
  var canvas = document.getElementById("c");
  var gl = initGL(canvas);

  // create & link program
  var program = createProgramFromScripts(gl, '2d-vertex-shader', '2d-fragment-shader');
  gl.useProgram(program);

  // create and bind geometry (color is in the shader)

  var vertices = [
      50,   50,  50,
      25,   100, 50,
      75,   100, 50,
      100,  50,  50,
      75,   0,   50,
      25,   0,   50,
      0,    50,  50,
      25,   100,  50
  ];

  vertices = vertices.map(n => n * 2)

  var position = {
    type: 'attribute',
    name: 'a_position',
    data: new Float32Array(vertices),
    pointer: [3, gl.FLOAT, false, 0, 0],
  };

  var colors = [
    normalizeColor([255,  240,  85,   255]),    // Front face
    normalizeColor([146,  149,  152,  255]),    // Back face
    normalizeColor([12,   182,  145,  255]),    // Top face
    normalizeColor([255,    0,  72,   255]),    // Bottom face
    normalizeColor([185,  119,  211,  255]),    // Right face
    normalizeColor([255,  137,  147,  255])     // Left face
  ];

  var transforMatrix = {
    type: 'uniform',
    name: 'u_matrix',
    data: [],
    dataType: 'uniformMatrix3fv'
  };

  var color = {
    type: 'uniform',
    name: 'u_color',
    data: [],
    dataType: 'uniform4fv'
  };

  var space = {
    type: 'uniform',
    name: 'u_space',
    data: [],
    dataType: 'uniform1f'
  };

  var rad = {
    type: 'uniform',
    name: 'u_rad',
    data: [],
    dataType: 'uniform1f'
  };

  var draw = {
    type: 'draw',
    name: 'd_draw', // in this case the name is just used in the reconciler as a uniqueID; can gen ID in there if necc. instead
    drawCall: gl.drawArrays,
    data: [gl.TRIANGLE_FAN, 0, vertices.length/3]
  }

  let toDraw = _.map(_.range(6), (n) => {
    // set t/r/s
    var translation = [Math.random() * 500, Math.random() * 500];
    var rotation    = Math.random() * 45;
    var scaleScale  = Math.random() * 1.5 + 1.5;
    var scale       = [scaleScale, scaleScale];

    // Compute the matrices
    var matrix = m3.projection(gl.canvas.clientWidth, gl.canvas.clientHeight);
    matrix = m3.translate(matrix, translation[0], translation[1]);
    matrix = m3.rotate(matrix, degToRad(rotation));
    matrix = m3.scale(matrix, scale[0], scale[1]);

    let pos = Object.assign({}, position);

    let mat = Object.assign({}, transforMatrix);
    mat.data = [false, matrix];

    let col = Object.assign({}, color);
    col.data = [colors[n]];

    let spac = Object.assign({}, space);
    spac.data = [(n * 5) + 1];

    let rd = Object.assign({}, rad);
    rd.data = [n + 1];

    let dr = Object.assign({}, draw);

    render(gl, program, [mat, col, spac, rd, pos, dr]);

    return [mat, col, spac, rd, pos, dr];

  });


}

function initGL(canvas) {
  var gl = canvas.getContext("webgl");
  
  if (!gl) {
   console.error('Wat, no gl.');
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return gl;
}