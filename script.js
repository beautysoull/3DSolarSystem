// Initializing WebGL
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL is not supported by your browser!");
    throw new Error("WebGL not found");
}

// Shaders for orbits (white lines)
const vsSourceOrbit = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsSourceOrbit = `
    void main(void) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // White color for orbits
    }
`;

// Shaders for objects
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying highp vec2 vTextureCoord;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`;

const fsSource = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
`;

// Create a shader program
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to initialize shader program: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

// Loading shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

document.addEventListener("DOMContentLoaded", function () {
    // Defining the instruction for mobile or desktop devices
    function updateInstructions() {
        // Checking if the device is mobile
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
        // Getting the instruction elements
        const desktopInstructions = document.getElementById("desktopInstructions");
        const mobileInstructions = document.getElementById("mobileInstructions");

        if (isMobile) {
            // Hide instructions for computers and show mobile ones
            desktopInstructions.style.display = "none";
            mobileInstructions.style.display = "block";
        } else {
            // Hide the instruction for mobile and show it for computers
            desktopInstructions.style.display = "block";
            mobileInstructions.style.display = "none";
        }
    }

    // Run the function when the page loads
    updateInstructions();

    // We update the instructions when the window size changes (for example, when changing the screen orientation on tablets)
    window.addEventListener("resize", updateInstructions);
});

// Checking powers of two
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

// Loading texture
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([255, 255, 255, 255]);// Empty texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        
        
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

    };
    image.src = url;

    return texture;
}

// Initialize buffers for orbits
function initOrbitBuffer(gl, radius, segments = 100) {
    const positions = [];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        positions.push(x, 0, z);
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: positions.length / 3,
    };
}

// Orbital buffers
const orbitBuffers = {
    mercury: initOrbitBuffer(gl, 5),
    venus: initOrbitBuffer(gl, 6.7),
    earth: initOrbitBuffer(gl, 9.5),
    mars: initOrbitBuffer(gl, 12),
    jupiter: initOrbitBuffer(gl, 15),
    saturn: initOrbitBuffer(gl, 20.8),
    uranus: initOrbitBuffer(gl, 26),
    neptune: initOrbitBuffer(gl, 30),
};

// Orbit drawing function
function renderOrbit(gl, programInfo, orbitBuffer, modelViewMatrix, projectionMatrix) {
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.LINE_LOOP, 0, orbitBuffer.vertexCount);
}

// Initializing buffers for spheres
function initBuffers(gl, latBands, longBands, radius) {
    const positions = [];
    const textureCoordinates = [];
    const indices = [];
    for (let lat = 0; lat <= latBands; ++lat) {
        const theta = (lat * Math.PI) / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        for (let long = 0; long <= longBands; ++long) {
            const phi = (long * 2 * Math.PI) / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;
            const u = 1 - long / longBands;
            const v = 1 - lat / latBands;

            positions.push(radius * cosPhi * sinTheta, radius * cosTheta, radius * sinPhi * sinTheta);
            textureCoordinates.push(1 - long / longBands, 1 - lat / latBands);
        }
    }
    for (let lat = 0; lat < latBands; ++lat) {
        for (let long = 0; long < longBands; ++long) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return {
        position: initBuffer(gl, positions, 3),
        textureCoord: initBuffer(gl, textureCoordinates, 2),
        indices: initIndexBuffer(gl, indices),
        vertexCount: indices.length,
    };
}

function initBuffer(gl, data, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    buffer.size = size;
    return buffer;
}

function initIndexBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return buffer;
}

// Function for creating a ring
function initRingBuffers(gl, innerRadius, outerRadius, segments) {
    const positions = [];
    const textureCoordinates = [];
    const indices = [];

    for (let i = 0; i <= segments; ++i) {
        const angle = (i / segments) * 2 * Math.PI;

        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);

        // Outer edge of the ring
        positions.push(outerRadius * cosAngle, 0, outerRadius * sinAngle);
        textureCoordinates.push(i / segments, 1); // Horizontal stretching

        // Inner edge of the ring
        positions.push(innerRadius * cosAngle, 0, innerRadius * sinAngle);
        textureCoordinates.push(i / segments, 0); // Horizontal stretching
    }
    for (let i = 0; i < segments; ++i) {
        const first = i * 2;
        const second = first + 1;
        const third = first + 2;
        const fourth = first + 3;

        indices.push(first, second, third);
        indices.push(second, fourth, third);
    }
    return {
        position: initBuffer(gl, positions, 3),
        textureCoord: initBuffer(gl, textureCoordinates, 2),
        indices: initIndexBuffer(gl, indices),
        vertexCount: indices.length,
    };
}

// Camera control
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let cameraOffsetZ = 0;
let zoom = -3;
let rotationX = 0;
let rotationY = 0;
let isDragging = false; // Flag to check if the user is moving the camera
let offsetX = 0; // Camera X offset
let offsetY = 0; // Y camera offset
let lastX = 0, lastY = 0;
let isPinching = false; // Flag for pinch-zoom gesture
let isTouchDragging = false; // Flag for single touch
let touchEndTimeout; // Timer to prevent incorrect rotation

// Sensitivity coefficient for camera movement
const moveSpeed = 0.5;
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    // Get mouse coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert mouse coordinates to normalized coordinates [-1, 1]
    const normalizedMouseX = (mouseX / canvas.clientWidth) * 2 - 1;
    const normalizedMouseY = -((mouseY / canvas.clientHeight) * 2 - 1);

    // Move the camera towards the mouse when zooming
    offsetX += normalizedMouseX * (event.deltaY * 0.01);
    offsetY += normalizedMouseY * (event.deltaY * 0.01);

    // Increase/decrease zoom
    zoom -= event.deltaY * 0.01;
    zoom = Math.max(-1000, Math.min(-3, zoom));
});

// Add mouse control
let dragging = false;


// Function to stop/start rotation
document.getElementById("toggleButton").addEventListener("click", () => {
    isPaused = !isPaused;

    // Update button text
    const button = document.getElementById("toggleButton");
    button.textContent = isPaused ? "Start" : "Stop";
});

// Update zoom
canvas.addEventListener("wheel", (event) => {
    zoom -= event.deltaY * 0.01;
    zoom = Math.max(-80, Math.min(-3, zoom));
});

canvas.addEventListener("mousedown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
});

canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mousemove", (event) => {
    if (dragging) {
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

         // If left mouse button is pressed, move camera up/down and forward/back
         if (event.buttons === 1) {
            cameraOffsetX += deltaX * moveSpeed * 0.05; // Move left/right
            cameraOffsetY -= deltaY * moveSpeed * 0.05; // Move up/down
        }
        // f right mouse button is pressed, rotate centered
        if (event.buttons === 2) {
            rotationX -= deltaY * 0.01
            rotationY += deltaX * 0.01; 
        }
        // Update offset
        offsetX += deltaX * 0.01; // Scale movement
        offsetY -= deltaY * 0.01; // Invert Y for correct movement

        lastX = event.clientX;
        lastY = event.clientY;
    }
});

// Sensory devices
let touchStartX = 0, touchStartY = 0;
let lastPinchDistance = null;

canvas.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
        isTouchDragging = true;
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    if (event.touches.length === 2) {
        isPinching = true;
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
    }
    clearTimeout(touchEndTimeout); // Clearing the timer
});

canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        // Move one finger - rotate camera
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        rotationX += deltaY * 0.03;
        rotationY += deltaX * 0.03;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    if (event.touches.length === 2) {
        // Two fingers - pinch zoom gesture
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDistance) {
            zoom -= (lastPinchDistance - distance) * 0.01;
            zoom = Math.max(-100, Math.min(zoom, -3));
        }
        lastPinchDistance = distance;
    }
    event.preventDefault(); // Preventing default browser behavior
});

canvas.addEventListener("touchend", () => {
    if (event.touches.length === 0) {
        isPinching = false; // Finishing the pinch zoom
        isTouchDragging = false;

        // Set the timer before turning on the rotation
        touchEndTimeout = setTimeout(() => {
            isTouchDragging = true;
        }, 1000); 
    }
});

// Automatic canvas resizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

// Textures for objects
const textures = {
    sun: loadTexture(gl, "textures/sun.jpg"),
    earth: loadTexture(gl, "textures/earth.jpg"),
    moon: loadTexture(gl, "textures/moon.jpg"),
    stars: loadTexture(gl, "textures/stars_milky_way.jpg"),
    mercury: loadTexture(gl, "textures/mercury.jpg"),
    venus: loadTexture(gl, "textures/venus.jpg"),
    mars: loadTexture(gl, "textures/mars.jpg"),
    jupiter: loadTexture(gl, "textures/jupiter.jpg"),
    saturn: loadTexture(gl, "textures/saturn.jpg"),
    saturnRing: loadTexture(gl, "textures/saturn_rings.jpg"),
    uranus: loadTexture(gl, "textures/uranus.jpg"),
    neptune: loadTexture(gl, "textures/neptune.jpg"),
};

// Buffers for planets
const buffers = {
    sun: initBuffers(gl, 30, 30, 3),
    earth: initBuffers(gl, 30, 30, 1),
    moon: initBuffers(gl, 20, 20, 0.3),
    mercury: initBuffers(gl, 20, 20, 0.5),
    venus: initBuffers(gl, 30, 30, 0.9),
    mars: initBuffers(gl, 20, 20, 0.7),
    jupiter: initBuffers(gl, 30, 30, 2),
    saturn: initBuffers(gl, 30, 30, 1.8),
    saturnRing: initRingBuffers(gl, 2.2, 3.5, 64), // Inner and outer radius of the ring
    uranus: initBuffers(gl, 30, 30, 1.6),
    neptune: initBuffers(gl, 30, 30, 1.5),
    stars: initBuffers(gl, 30, 30, 100),
};

// Orbits of the planets
const orbits = {
    mercury: { distance: 5, speed: 1.6, angle: 0 },
    venus: { distance: 6.7, speed: 1.2, angle: 0 },
    earth: { distance: 9.5, speed: 1, angle: 0 },
    mars: { distance: 12, speed: 0.8, angle: 0 },
    jupiter: { distance: 15, speed: 0.4, angle: 0 },
    saturn: { distance: 20.8, speed: 0.3, angle: 0 },
    uranus: { distance: 26, speed: 0.2, angle: 0 },
    neptune: { distance: 30, speed: 0.1, angle: 0 },
    moon: { distance: 2, speed: 2.5, angle: 0 },
};

// Object drawing function
function renderObject(gl, programInfo, buffers, texture, modelViewMatrix, projectionMatrix) {
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, buffers.position.size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, buffers.textureCoord.size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.sampler, 0);

    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

let earthRotation = 0;
let moonRotation = 0;
let moonOrbit = 0;
let rotationAngle = 0;
let moonRotationAngle = 0;

// Scene rendering function
function drawScene(deltaTime) {
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, (45 * Math.PI) / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 200.0);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [cameraOffsetX, cameraOffsetY, zoom + cameraOffsetZ]);
    rotationAngle += deltaTime * 0.5;

    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI, [1, 0, 0]);// Rotate X 180 degrees to fix "upside down"
    mat4.scale(modelViewMatrix, modelViewMatrix, [1, 1, -1]);// Invert the Z axis to eliminate specularity

    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);// Up/down
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);// Left/right

    // Starry background
    const starsMatrix = mat4.clone(modelViewMatrix);
    mat4.scale(starsMatrix, starsMatrix, [1, 1, -1]); // Invert the Z axis
    renderObject(gl, programInfo, buffers.stars, textures.stars, starsMatrix, projectionMatrix);
    
    // Drawing orbits
    Object.keys(orbitBuffers).forEach((orbit) => {
        renderOrbit(gl, orbitProgramInfo, orbitBuffers[orbit], modelViewMatrix, projectionMatrix);
    });

    // Earth
    const earthMatrix = mat4.clone(modelViewMatrix);
    earthRotation += deltaTime * 0.5; // Expected rotation of the Earth around the Y axis
    mat4.rotate(earthMatrix, earthMatrix, orbits.earth.angle, [0, 1, 0]);
    mat4.translate(earthMatrix, earthMatrix, [orbits.earth.distance, 0, 0]);
    renderObject(gl, programInfo, buffers.earth, textures.earth, earthMatrix, projectionMatrix);

    // Moon
    const moonMatrix = mat4.clone(earthMatrix);
    mat4.rotate(moonMatrix, moonMatrix, orbits.moon.angle, [0, 1, 0]);
    mat4.translate(moonMatrix, moonMatrix, [orbits.moon.distance, 0, 0]);
    renderObject(gl, programInfo, buffers.moon, textures.moon, moonMatrix, projectionMatrix);

    moonOrbit -= deltaTime * 0.2; // The moon revolves around the earth
    moonRotation += deltaTime * 1.0; // The moon rotates on its axis

    // The other planets and the Sun appear when zoomed out.
    if (zoom < -10) {
        const sunMatrix = mat4.clone(modelViewMatrix);
        renderObject(gl, programInfo, buffers.sun, textures.sun, sunMatrix, projectionMatrix);

        Object.keys(orbits).forEach((planet) => {
            if (planet === "moon" || planet === "earth") return;

            const planetMatrix = mat4.clone(modelViewMatrix);
            mat4.rotate(planetMatrix, planetMatrix, orbits[planet].angle, [0, 1, 0]);
            mat4.translate(planetMatrix, planetMatrix, [orbits[planet].distance, 0, 0]);
            renderObject(gl, programInfo, buffers[planet], textures[planet], planetMatrix, projectionMatrix);

            if (planet === "saturn") {
                // Drawing a ring
                const ringMatrix = mat4.clone(planetMatrix);
                renderObject(gl, programInfo, buffers.saturnRing, textures.saturnRing, ringMatrix, projectionMatrix);
            }
        });
    }
}

// Animation
let isPaused = false;
let lastTime = 0;
function animate(now) {
    now *= 0.001;
    const deltaTime = now - lastTime;
    lastTime = now;

    // If there is a pause, we do not update the rotation angles
    if (!isPaused) {
        Object.keys(orbits).forEach((planet) => {
            orbits[planet].angle += deltaTime * orbits[planet].speed;
        });
    }    
    drawScene(deltaTime);
    requestAnimationFrame(animate);
    
}

// Initialization of programs
const orbitShaderProgram = initShaderProgram(gl, vsSourceOrbit, fsSourceOrbit);
const orbitProgramInfo = {
    program: orbitShaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(orbitShaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(orbitShaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(orbitShaderProgram, "uModelViewMatrix"),
    },
};

const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
    },
};

requestAnimationFrame(animate);// Starting animation
