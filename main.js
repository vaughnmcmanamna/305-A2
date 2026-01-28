
var canvas;
var gl;

var program;

var near = -7;
var far = 100;


var left = -15.0;
var right = 15.0;
var ytop =15.0;
var bottom = -15.0;


var lightPosition2 = vec4(0, 0.0, 10.0, 1.0 );
var lightPosition = vec4(0, 0.0, 10, 1.0 );

var lightAmbient = vec4(0.5, 0.4, 0.4, 1.0 );
var lightDiffuse = vec4( 0., 0.3, 0.3, 1.0);
var lightSpecular = vec4( 0.1, 0.1, 0.1, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialSpecular = vec4( 1, 0.8, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;


var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0;
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

//these are for my camera movement
var center = vec3(0, 0, 0); 
var radius = 1; 
var angle = 130; 


var eye = vec3(0,0.5, 10); 
var up = vec3(0, 1, 0); 
var at = vec3(0.0, 0.0, 0.0);

//code for my wing flapping
var angleFirstPart = 30;
var angleFlapper = 30;
var maxAngleFirstPart = 10; 
var minAngleFirstPart = -10; 
var maxAngleFlapper = 35; 
var minAngleFlapper = -35;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var currentRotation = [0,0,0];

var useTextures = 0;

//making a texture image procedurally
//Let's start with a 1-D array
var texSize = 8;
var imageCheckerBoardData = new Array();

// Now for each entry of the array make another array
// 2D array now!
for (var i =0; i<texSize; i++)
	imageCheckerBoardData[i] = new Array();

// Now for each entry in the 2D array make a 4 element array (RGBA! for colour)
for (var i =0; i<texSize; i++)
	for ( var j = 0; j < texSize; j++)
		imageCheckerBoardData[i][j] = new Float32Array(4);

// Now for each entry in the 2D array let's set the colour.
// We could have just as easily done this in the previous loop actually
for (var i =0; i<texSize; i++) 
	for (var j=0; j<texSize; j++) {
		var c = (i + j ) % 2;
		imageCheckerBoardData[i][j] = [c, c, c, 1];
}

//Convert the image to uint8 rather than float.
var imageCheckerboard = new Uint8Array(4*texSize*texSize);

for (var i = 0; i < texSize; i++)
	for (var j = 0; j < texSize; j++)
	   for(var k =0; k<4; k++)
			imageCheckerboard[4*texSize*i+4*j+k] = 255*imageCheckerBoardData[i][j][k];
		
// For this example we are going to store a few different textures here
var textureArray = [] ;

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition2) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
    if (im.complete) {
        console.log("loaded") ;
        return true ;
    }
    else {
        console.log("still not loaded!!!!") ;
        return false ;
    }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename)
{
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(tex); }
}

// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
	
	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    


	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually laoded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               wtime = (new Date()).getTime() ;
               if( n != texs.length )
               {
               		console.log(wtime + " not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
					render(0);
               }
		},
	5) ;
}

// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();

	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);

    tex.isTextureReady = true;
}

// This just calls the appropriate texture loads for this example adn puts the textures in an array
function initTexturesForExample() {
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/feather.bmp") ;
    
    textureArray.push({}) ;
    loadImageTexture(textureArray[textureArray.length-1],"images/Meat.bmp");

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/fence.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/grass.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/eye.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/steak.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/00.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/10.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/20.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/30.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/40.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/50.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/60.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/scene/70.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/kfc.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/wood.bmp") ;

    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"images/metal.bmp") ;
    
    
}

function toggleTextures() {
    useTextures = (useTextures + 1) % 2;
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1, 0.8, 0.8, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram(program);
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true  ;
            resetTimerFlag = true ;
            window.requestAnimFrame(render);
        }
    };
    
    document.getElementById("textureToggleButton").onclick = function() {
        toggleTextures();
        if (animFlag) {
            window.requestAnimFrame(render);
        }
    };

    var controller = new CameraController(canvas);
    controller.onchange = function(xRot,yRot) {
        RX = xRot ;
        RY = yRot ;
        window.requestAnimFrame(render); };
	
	
	// Helper function just for this example to load the set of textures
    initTexturesForExample() ;

    waitForTextures(textureArray);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

function generateTextureCoordinates(x, y) {
    const u = (x + 15) / 10; // Assuming x ranges from -5 to 5
    const v = (y + 15) / 10; // Assuming y ranges from -5 to 5
    return vec2(u, v);
}

//all the variables for my movement and fucntions
var curTime = performance.now();
var lastTime = 0;
var frames = 0;

var startFlapping = 0;
var eyeRotation = 10;

let currentAngle = 0;
let rotateDown = true;
let finalAngle = -70
let initialAngle = 0;

let beakAngle = 0;

let birdHeight = 0;

const flapFrequency = 0.0043;
const maxVerticalSpeed = 0.02

function render(timestamp) {

    //this controls the birds bend down movement at the start 
    if (rotateDown && currentAngle > finalAngle) {
        // Rotate down
        currentAngle -= 0.8; 
    } else if (!rotateDown && currentAngle < initialAngle) {
        // Rotate up
        currentAngle += 0.8;
    }
    
    if (performance.now() < 7000){
        rotateDown = true;
    } else{
        rotateDown = false;
    }


    //this calculates the fps by counting the number of frames every 2 seconds 

    if (performance.now() - lastTime >=2000) {
        let fps = 1 / dt;
        console.log(`FPS: ${fps}`); 
        lastTime = performance.now();
    }


    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye[0] = center[0] + radius * Math.sin(radians(angle));
    eye[2] = center[2] + radius * Math.cos(radians(angle));
    viewMatrix = lookAt(eye, center, up);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    //projectionMatrix = perspective(120, 1, 1, 20 ) 

    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	
	// We need to bind our textures, ensure the right one is active before we draw
	//Activate a specified "texture unit".
    //Texture units are of form gl.TEXTUREi | where i is an integer.
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
	gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	
   

    let curMbrahd = performance.now()
    
    //after 18 seconds, the bird starts flapping its wings and starts flying away
    if (curMbrahd >18000){
        angleFirstPart = Math.sin(timestamp * 0.004) * (maxAngleFirstPart - minAngleFirstPart) + minAngleFirstPart;
        angleFlapper = Math.sin(timestamp * 0.004) * (maxAngleFlapper - minAngleFlapper) + minAngleFlapper;
        // Update bird's position
        const scaledAngleFirstPart = (Math.sin(timestamp * flapFrequency) + 1) * 0.3; 
        const scaledAngleFlapper = (Math.sin(timestamp * flapFrequency) + 1) * 0.6; 
        const verticalSpeed = maxVerticalSpeed * (1 - scaledAngleFirstPart) * scaledAngleFlapper;
        birdHeight += verticalSpeed;

    } else if (curMbrahd >= 2000 && curMbrahd <= 7400){
        beakAngle = 4 * Math.sin(0.01 * timestamp);
    }
    gPush()
        gTranslate(0,-10,0)
        gPush()
            gTranslate(0,2,0)
            //chicken
            gPush();
                gTranslate(0,birdHeight-2,-3)
                gScale(1.3,1.3,1.3);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
                gl.uniform1i(gl.getUniformLocation(program, "texture2"), 0);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                //chicken upper body
                gPush()
                gRotate(currentAngle,0,0,1)
                    gPush()
                        toggleTextures()
                        setColor(vec4(1.0, 1.0, 1.0, 1.0));
                        gPush()
                            gTranslate(0,0,0)
                            gScale(1.5,1,0.75);
                            gPush();
                                drawCube();
                            gPop()
                    gPop()
                    
                    //head
                    gPush()
                        gTranslate(1.75,1,0)
                        gPush()
                            gScale(0.5,1,0.5)
                            drawCube()
                        gPop()
                        //top beak
                        setColor(vec4(1.0, 1.0, 0.0, 1.0));
                        gPush()
                            gTranslate(1,0.1,0)
                            gTranslate(-1,0,0)
                            gRotate(beakAngle,0,0,1)
                            gTranslate(1,0,0);
                            gPush()
                                gScale(0.5,0.1,0.5)
                                drawCube();
                            gPop()
                        gPop()
                        //bottom beak 
                        gPush()
                            gTranslate(1,-0.2,0)
                            gPush()
                                gScale(0.5,0.1,0.5)
                                drawCube();
                            gPop()
                        gPop()
                        toggleTextures()
                        eyeRotation-=2;
                        //left eyes 
                        setColor(vec4(1.0, 1.0, 1.0, 1.0));
                        toggleTextures()
                        gPush()
                            gTranslate(0.0,0.5,0.3)
                            
                            gPush()
                                gScale(0.3,0.3,0.3);
                                gl.activeTexture(gl.TEXTURE2);
                                gl.bindTexture(gl.TEXTURE_2D, textureArray[4].textureWebGL);
                                gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                                drawCube()
                            gPop()
                        gPop()
                        //right eye
                        gPush()
                            gTranslate(0.0,0.5,-0.3)
                            gPush()
                                gScale(0.3,0.3,0.3);
                                drawCube()
                            gPop()
                        gPop()
                        toggleTextures()

                        
                        //red thing top
                        setColor(vec4(1.0, 0.0, 0.0, 1.0));
                        gPush()
                            gTranslate(0.3,0.8,0)
                            gPush()
                                gScale(0.5,0.7,0.1)
                                drawCube();
                            gPop()
                        gPop()
                        //red thing bottom
                        gPush()
                            gTranslate(0.3,-0.8,0)
                            gPush()
                                gScale(0.5,0.5,0.1)
                                drawCube();
                            gPop()
                        gPop()         
                    gPop()
                    //left wing
                    toggleTextures()
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    setColor(vec4(1.0, 1.0, 1.0, 1.0));
                    gPush()
                        gTranslate(0,0,1)
                        gTranslate(0,0,-0.5);
                        gRotate(15, 1, 0, 0);
                        gRotate(angleFirstPart, 1, 0, 0);
                        gTranslate(0,0,0.5)
                        //first part
                        gPush()
                            gScale(1.4,0.1, 0.5);
                            drawCube()
                        gPop()
                        //flapper
                        gPush()
                            gTranslate(0,0,1)
                            gTranslate(0,0,-0.5)
                            gRotate(15, 1, 0, 0);
                            gRotate(angleFlapper, 1, 0, 0);
                            gTranslate(0,0,0.5)
                            gScale(1.1,0.1, 0.5);
                            drawCube()
                        gPop()
                    gPop()
                    //right wing
                    gPush()
                        gTranslate(0,0,-1)
                        gTranslate(0,0,0.5);
                        gRotate(-15, 1, 0, 0);
                        gRotate(-angleFirstPart, 1, 0, 0);
                        gTranslate(0,0,-0.5)
                        gPush()
                            gScale(1.4,0.1, 0.5);
                            drawCube()
                        gPop()
                        //flapper
                        gPush()
                            gTranslate(0,0,-1)
                            gTranslate(0,0,0.5)
                            gRotate(-15, 1, 0, 0);
                            gRotate(-angleFlapper, 1, 0, 0);
                            gTranslate(0,0,-0.5)
                            gScale(1.1,0.1, 0.5);
                            drawCube()
                        gPop()
                    gPop()
                gPop()
                toggleTextures()
                //legs
                gPop()
                setColor(vec4(1.0, 1.0, 0.0, 1.0));
                gPush()
                    //left leg
                    gTranslate(0,-2,0.3)
                    gScale(0.1,1,0.1)
                    drawCube()
                gPop()
                //right leg
                gPush()
                    //left leg
                    gTranslate(0,-2,-0.3)
                    gScale(0.1,1,0.1)
                    drawCube()
                gPop()
            gPop()

            //ground
            setColor(vec4(11/255, 94/255, 33/255, 1.0));
            toggleTextures()
            gPush()
                gTranslate(0,-6,0)
                gScale(30,0.1,30)
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, textureArray[3].textureWebGL);
                gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

                drawCube()
            gPop()
            toggleTextures()
            
            
            //surroundings
            setColor(vec4(1.0, 1.0, 1.0, 0.0));
            toggleTextures()
            gPush()
                //0
                gPush()
                    gTranslate(0,5,-20)
                    gScale(8.4,12.85,0.2)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[12].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //1
                gPush()
                    gRotate(45,0,1,0)
                    gTranslate(0,5,-20)
                    gScale(8.4,12.85,0.2)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[11].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //2
                gPush()
                    gTranslate(-20,5,0)
                    gScale(0.21,12.85,8.4)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[10].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //3
                gPush()
                    gRotate(45,0,1,0)
                    gTranslate(-20,5,0)
                    gScale(0.21,12.85,8.4)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[9].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //4
                gPush()
                    gTranslate(20,5,0)
                    gScale(0.21,12.85,8.4)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[6].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //5
                gPush()
                    gRotate(45,0,1,0)
                    gTranslate(20,5,0)
                    gScale(0.21,12.85,8.4)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[13].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                //6
                gPush()
                    gTranslate(0,5,20)
                    gScale(8.4,12.85,0.21)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[8].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
                gPush()
                    gRotate(45,0,1,0)
                    gTranslate(0,5,20)
                    gScale(8.4,12.85,0.21)
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, textureArray[7].textureWebGL);
                    gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    drawCube()
                gPop()
            gPop()

            toggleTextures()

            //weights
        setColor(vec4(0.4, 0.4, 0.4, 1.0));

        gPush()
            //bench
            setColor(vec4(0.5, 0.2, 0.2, 1.0));
            gScale(1.3,1.3,1.3)
            gTranslate(0,-4,-10)
            gPush()
                gTranslate(0,0.5,0)
                gScale(1,0.3,2)
                drawCube()
            gPop()
            //bench legs
            setColor(vec4(0.0, 0.0, 0.0, 1.0));
            gPush()
                gTranslate(-0.6,-2,1.8)
                gScale(0.1,2.5,0.1)
                drawCube()
            gPop()
            gPush()
                gTranslate(0.6,-2,1.8)
                gScale(0.1,2.5,0.1)
                drawCube()
            gPop()
            gPush()
                gTranslate(-0.6,-2,-1.8)
                gScale(0.1,2.5,0.1)
                drawCube()
            gPop()
            gPush()
                gTranslate(0.6,-2,-1.8)
                gScale(0.1,2.5,0.1)
                drawCube()
            gPop()
            //let rack
            gPush()
                setColor(vec4(0.0, 0.0, 0.0, 1.0));
                gTranslate(-2.5,0,-0.9)
                gScale(0.2,2.5,0.2)
                drawCube()
            gPop()
            //right rack
            gPush()
                setColor(vec4(0.0, 0.0, 0.0, 1.0));
                gTranslate(2.5,0,-0.9)
                gScale(0.2,2.5,0.2)
                drawCube()
            gPop()
            //bar
            gPush()
                setColor(vec4(0.2, 0.2, 0.2, 1.0));
                gTranslate(0,2.6,-0.9)
                gRotate(90,0,1,0)
                gScale(0.3,0.3,7)
                drawCylinder()
            gPop()
            //left weights
            gPush()
                gTranslate(-3,2.6,-0.9)
                gScale(0.3,1,1)
                drawSphere()
                gTranslate(-0.8,0,0)
                drawSphere()
                gTranslate(-0.8,0,0)
                drawSphere()
                gTranslate(-0.8,0,0)
                drawSphere()
            gPop()
            //right weights
            gPush()
                gTranslate(3,2.6,-0.9)
                gScale(0.3,1,1)
                drawSphere()
                gTranslate(0.8,0,0)
                drawSphere()
                gTranslate(0.8,0,0)
                drawSphere()
                gTranslate(0.8,0,0)
                drawSphere()
            gPop()
        gPop()

        //kfc bucket
        toggleTextures()
        setColor(vec4(1.0, 1.0, 1.0, 0.0));
        gPush()
            gTranslate(-12,-3,-6)
             //bucket
            gPush()
                gRotate(-90,1,0,0)
                gRotate(150,0,0,1)
                gScale(5,5,5)
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, textureArray[14].textureWebGL);
                gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); 
                drawCylinder()
            gPop()
            
            //chicken chunks
            setColor(vec4(115/255, 53/255, 6/255, 0.0));

            gPush()
                gTranslate(0,2.4,0);
                gScale(2.45,1,2.45)
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, textureArray[3].textureWebGL);
                gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                drawSphere()
            gPop()
            toggleTextures()
        gPop()

        toggleTextures()
        setColor(vec4(1, 1, 1, 0.0));

        //coop
        gPush()
            gTranslate(0,1,10)
            gRotate(90,0,1,0)
            //main part
            setColor(vec4(0.8, 0.4, 0.4, 1.0));
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, textureArray[15].textureWebGL);
            gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gPush()
                gScale(5,3,5)
                drawCube()
            gPop()
            setColor(vec4(1, 1, 1, 0.0));

            //legs
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, textureArray[15].textureWebGL);
            gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gPush()
                gTranslate(4.5,-3,-4.5)
                gScale(0.8,6,0.8)
                drawCube()
            gPop()
            gPush()
                gTranslate(-4.5,-3,-4.5)
                gScale(0.8,6,0.8)
                drawCube()
            gPop()
            gPush()
                gTranslate(4.5,-3,4.5)
                gScale(0.8,11.5,0.8)
                drawCube()
            gPop()
            gPush()
                gTranslate(-4.5,-3,4.5)
                gScale(0.8,11.5,0.8)
                drawCube()
            gPop()
            //roof
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, textureArray[16].textureWebGL);
            gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gPush()
                gTranslate(0,6,0)
                gRotate(-30,1,0,0)
                gScale(6,0.5,7)
                drawCube()
            gPop()
            //ramp
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, textureArray[15].textureWebGL);
            gl.uniform1i(gl.getUniformLocation(program, "texture2"), 2);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gPush()
                gTranslate(7,-4,0)
                gRotate(-45,0,0,1)
                gScale(5,0.3,2)
                drawCube()
            gPop()
            //ramp stairs
            gPush()
                gTranslate(7,-3.4,0)
                gRotate(-45,0,0,1)
                gScale(0.3,0.2,2.2)
                drawCube()
            gPop()
            gPush()
                gTranslate(9,-5.5,0)
                gRotate(-45,0,0,1)
                gScale(0.3,0.2,2)
                drawCube()
            gPop()
            //ramp door
            setColor(vec4(0.3, 0.3, 0.3, 1));
            gPush()
                gTranslate(4.9,0.3,0)
                gScale(0.3,2,2)
                drawCube()
            gPop()
            
        gPop()
        toggleTextures()


    gPop()
    if (performance.now() > 8000){ 
        angle += 0.2;
    }
   
    if( animFlag )
        window.requestAnimFrame(render);
}


function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
}
