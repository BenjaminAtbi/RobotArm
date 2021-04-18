"use strict";

var canvas, gl, program;

var NumVertices = 36; //(6 faces)(2 triangles/face)(3 vertices/triangle)

var NumSides = 200; //number of side on cylinder

var velocity = .001;

var points = [];
var colors = [];
var normals = [];
var lightsource = [];
var cameraPos = [];

var basePos = [];
var oldPos = [];
var curPos = [];
var newPos = [];
var spherePos = [];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5,  0.5,  0.5, 1.0 ),
    vec4(  0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5,  0.5, -0.5, 1.0 ),
    vec4(  0.5, -0.5, -0.5, 1.0 )
];



// RGBA colors
var vertexColors = [
    vec3( 0.0, 0.0, 0.0 ),  // black
    vec3( 1.0, 0.0, 0.0 ),  // red
    vec3( 1.0, 1.0, 0.0 ),  // yellow
    vec3( 0.0, 1.0, 0.0 ),  // green
    vec3( 0.0, 0.0, 1.0 ),  // blue
    vec3( 1.0, 0.0, 1.0 ),  // magenta
    vec3( 1.0, 1.0, 1.0 ),  // white
    vec3( 0.0, 1.0, 1.0 )   // cyan
];


// Parameters controlling the size of the Robot's arm

var BASE_HEIGHT      = 0.5;
var BASE_WIDTH       = 0.5;
var LOWER_ARM_HEIGHT = 2.0;
var LOWER_ARM_WIDTH  = 0.3;
var UPPER_ARM_HEIGHT = 2.0;
var UPPER_ARM_WIDTH  = 0.3;


// Shader transformation matrices

var modelViewMatrix, projectionMatrixTop, projectionMatrixSide;

// Array of rotation angles (in degrees) for each rotation axis

var Base = 0;
var LowerArm = 1;
var UpperArm = 2;

var theta= [ 0, 0, 0];

var angle = 0;

var modelViewMatrixLoc;

var vBuffer, cBuffer, nBuffer;

var TOPVIEW = false;
var state = 0;

//----------------------------------------------------------------------------

function quad(a,  b,  c,  d , color) {
    colors.push(vertexColors[color]);
    points.push(vertices[a]);
    colors.push(vertexColors[color]);
    points.push(vertices[b]);
    colors.push(vertexColors[color]);
    points.push(vertices[c]);
    colors.push(vertexColors[color]);
    points.push(vertices[a]);
    colors.push(vertexColors[color]);
    points.push(vertices[c]);
    colors.push(vertexColors[color]);
    points.push(vertices[d]);
}

function CubeRainbow() {
    quad( 1, 0, 3, 2 ,1);
    quad( 2, 3, 7, 6, 2);
    quad( 3, 0, 4, 7, 3);
    quad( 6, 5, 1, 2, 6);
    quad( 4, 5, 6, 7, 4);
    quad( 5, 4, 0, 1, 5);
}

function Cube(color){
    quad( 1, 0, 3, 2, color);
    quad( 2, 3, 7, 6, color);
    quad( 3, 0, 4, 7, color);
    quad( 6, 5, 1, 2, color);
    quad( 4, 5, 6, 7, color);
    quad( 5, 4, 0, 1, color);
}

function Cylinder(color) {
    
    var x, z, angle = 0;
    var inc = Math.PI * 2.0 / NumSides;
    
    var cylpoints = []
    var cylcolors = []

    for (var i = 0; i < NumSides; i++){
        x = 0.5 * Math.cos(angle);
        z = 0.5 * Math.sin(angle);

        cylpoints.push(vec4( x, 0.5, z, 1.0));
        cylpoints.push(vec4( x, -0.5, z, 1.0));

        //cycle colors for now
        cylcolors.push(vertexColors[color]);
        cylcolors.push(vertexColors[color]);
        angle += inc;
    }

    //wrap first set of points for last face
    cylpoints.push(cylpoints[0]);
    cylpoints.push(cylpoints[1]);
    cylcolors.push(vertexColors[color]);
    cylcolors.push(vertexColors[color]);

    for(var i = 0; i < NumSides * 2; i += 2){
        points.push(cylpoints[i])
        colors.push(cylcolors[i])
        points.push(cylpoints[i+1])
        colors.push(cylcolors[i+1])
        points.push(cylpoints[i+3])
        colors.push(cylcolors[i+3])
        points.push(cylpoints[i])
        colors.push(cylcolors[i])
        points.push(cylpoints[i+2])
        colors.push(cylcolors[i+2])
        points.push(cylpoints[i+3])
        colors.push(cylcolors[i+3])
        points.push(cylpoints[i])
        colors.push(cylcolors[i])
        points.push(cylpoints[i+2])
        colors.push(cylcolors[i+2])
        points.push(vec4(0,0.5,0,1.0))
        colors.push(cylcolors[i+2])
    }
}

function loadShapes(){
    Cylinder(3);
    loadCylinderNormals();
    Cube(4);
    Cube(1);
    loadRectNormals();
    loadRectNormals();
}

function loadNormalFace(face){
    for(var i = 0; i < 6; i++){
        normals.push(face)
    }
    
}

function loadRectNormals(){
    //front
    loadNormalFace([0,0,1]);
    //right
    loadNormalFace([1,0,0]);
    //bottom
    loadNormalFace([0,-1,0]);
    //top
    loadNormalFace([0,1,0]);
    //back
    loadNormalFace([0,0,-1]);
    //left
    loadNormalFace([-1,0,0]);
}

function loadCylinderNormals(){
    var normMatrix = mat4(1,0,0)
    var angle = 0;
    var inc = 360 / NumSides;

    for(var i = 0; i < NumSides; i++){    
        var rotateMatrix = rotate(angle, 0,1,0);
        var newMatrix = mult(normMatrix, rotateMatrix);
        var normalFace = newMatrix[0].slice(0,3);
        loadNormalFace(normalFace);

        //top polygon
        for(var j = 0; j < 3; j++){
            normals.push([0,1,0])
        }
        angle += inc;
    }
}
//____________________________________________

// Remmove when scale in MV.js supports scale matrices

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}


//Calculate positions

function AxisYTheta(pos){
    if(pos[0] < 0 && pos[2] >= 0) {
        return -1 * Math.atan(pos[2] / pos[0]);
    }
    if(pos[0] >= 0 && pos[2] >= 0) {
        return radians(180) - Math.atan(pos[2] / pos[0]);
    } 
    if(pos[0] < 0 && pos[2] < 0) {
        return -1 * Math.atan(pos[2] / pos[0]); 
    }
    if(pos[0] == 0 && pos[2] < 0) {
            
            return -1 * radians(90);
    }
    if(pos[0] > 0 && pos[2] < 0) {            
        return -1 * radians(180) - Math.atan(pos[2] / pos[0]);
    }
}

function AxisZTheta(pos){
    return Math.atan(pos[1] / Math.hypot(pos[0], pos[2]));
}

function AngleDelta(pos1, pos){
theta[Base] = AxisYTheta(old) * 180 / Math.PI;
theta[LowerArm] = extentionAngle - armAdjustAngle;
theta[UpperArm] = 2 * armAdjustAngle;
}

// }
//--------------------------------------------------


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.clearColor( .7, .7, .7, 1 );
    gl.enable( gl.DEPTH_TEST );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );

    gl.useProgram( program );

    loadShapes();
    
    // Load shaders and use the resulting shader program

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Create and initialize  buffer objects

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // define lighting parameters

    //define our lightsource
    lightsource = vec3(-2.0,0.5,1.0);

    //define camera position
    cameraPos = vec3(0.0,0.0,5.0);
    
    basePos = vec3(1.5,1.0,1.5);
    curPos = vec3(basePos);

    //ambient lighting coefficient
    var ambientCoefficient = gl.getUniformLocation(program, "Ac");
    gl.uniform1fv(ambientCoefficient,[0.3]);

    var lightPosition = gl.getUniformLocation(program, "vLightPos");
    gl.uniform3fv(lightPosition, flatten(normalize(lightsource)));

    var cameraPosition = gl.getUniformLocation(program, "cameraPos");
    gl.uniform3fv(cameraPosition, flatten(normalize(cameraPos)));

    //define event listeners
    document.getElementById("moveButton").onclick = function(event) {
        var old = [];
        var newer = [];
        old[0] = parseFloat(document.getElementById("old_x").value);
        old[1] = parseFloat(document.getElementById("old_y").value);
        old[2] = parseFloat(document.getElementById("old_z").value);
        newer[0] = parseFloat(document.getElementById("new_x").value);
        newer[1] = parseFloat(document.getElementById("new_y").value);
        newer[2] = parseFloat(document.getElementById("new_z").value);
        startFetch(old, newer);
    };

    document.getElementById("viewButton").onclick = swapView;


    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    
    projectionMatrixSide = ortho(-5, 5, -5, 5, -10, 10);
    var r = rotate(90,1,0,0);
    projectionMatrixTop = mult(projectionMatrixSide,r);

    //projectionMatrix = perspective(90,1,0,5);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrixSide) );

    PositionArm(basePos);
    render();
}


// function bindRectBuffers(){
//     gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
//     gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

//     gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
//     gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
// }

//----------------------------------------------------------------------------


function base() {
    var s = scale4(BASE_WIDTH, BASE_HEIGHT, BASE_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * BASE_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, 0, NumSides * 9 );
    //gl.drawArrays( gl.TRIANGLES, NumSides * 6, NumVertices );
}

//----------------------------------------------------------------------------

function upperArm() {
    var s = scale4(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
    var instanceMatrix = mult(translate( 0.0, 0.5 * UPPER_ARM_HEIGHT, 0.0 ),s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, NumSides * 9 + NumVertices, NumVertices );
    //gl.drawArrays( gl.TRIANGLES, NumSides * 6 + NumVertices * 2, NumVertices );
}

//----------------------------------------------------------------------------


function lowerArm()
{
    var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * LOWER_ARM_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(t) );
    gl.drawArrays( gl.TRIANGLES, NumSides * 9, NumVertices );
    //gl.drawArrays( gl.TRIANGLES, NumSides * 6 + NumVertices, NumVertices );
}

function swapView() {
    if(TOPVIEW){
        gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrixSide));
        cameraPos = vec3(0.0,0.0,5.0);
        TOPVIEW = false;
    } else {
        gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrixTop));
        cameraPos = vec3(0.0,5.0,0.0);
        TOPVIEW = true;
    }
}

function startFetch(old, newer){
    var extentionLength = Math.hypot(old[0],old[1], old[2]);

    if(extentionLength > UPPER_ARM_HEIGHT * 2){
        console.log("old position out of reach");
        return;
    }

    if(state != 0){
        return;
    }

    oldPos = old;
    spherePos = old;
    newPos = newer;
    state = 1;
}

function PositionArm(pos){
    var extentionLength = Math.hypot(pos[0],pos[1], pos[2]);
    var extentionAngle = 90 - AxisZTheta(pos) * 180 / Math.PI;
    var armAdjustAngle = Math.acos( (extentionLength/2) / LOWER_ARM_HEIGHT) * 180 / Math.PI;

    theta[Base] = AxisYTheta(pos) * 180 / Math.PI;
    theta[LowerArm] = extentionAngle - armAdjustAngle;
    theta[UpperArm] = 2 * armAdjustAngle;
}

function updatePos(target){
    var done = true;

    var distance = velocity * delta_time;

    for (var i = 0; i < 3; i++){
        if(curPos[i] < target[i]){
            if(target[i] - curPos[i] < distance){
                curPos[i] = target[i];
            } 
            else {
                curPos[i] += distance;
            }
            done = false;
        }
        if(curPos[i] > target[i]){
            if(curPos[i] - target[i] < distance){
                curPos[i] = target[i];
            } 
            else {
                curPos[i] -= distance;
            }
            done = false;
        }
    }
    return done;
}

function fetchSequence(){
    switch(state){
        case 0: break;
        case 1:
            if(updatePos(oldPos)){
                state = 2;
                spherePos = oldPos;
            }
            PositionArm(curPos);
            break;
        case 2:
            if(updatePos(newPos)){
                state = 3;
            }
            PositionArm(curPos);
            spherePos = vec3(curPos);
            break;
        case 3:
            if(updatePos(basePos)){
                state = 0;
            }
            PositionArm(curPos);
            break;
        }       
}
//----------------------------------------------------------------------------

var last_frame = 0;
var delta_time = 0;

var render = function(now) {

    delta_time = now - last_frame;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    fetchSequence();

    modelViewMatrix = rotate(theta[Base], 0, 1, 0 );
    base();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[LowerArm], 0, 0, 1 ));
    lowerArm();

    modelViewMatrix  = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    modelViewMatrix  = mult(modelViewMatrix, rotate(theta[UpperArm], 0, 0, 1) );
    upperArm();

    modelViewMatrix = rotate(0, 0, 1, 0);
    modelViewMatrix = mult(modelViewMatrix, translate(spherePos));
    base();

    last_frame = now;
    requestAnimFrame(render);
}

