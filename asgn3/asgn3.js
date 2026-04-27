var MESH_VS = `#version 300 es
precision highp float;

in vec4 a_Position;
in vec2 a_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewProjection;

out vec2 v_UV;

void main() {
  gl_Position = u_ViewProjection * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

var MESH_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 v_UV;

uniform sampler2DArray u_TextureArray;
uniform vec4 u_BaseColor;
uniform float u_TexColorWeight;
uniform int u_TexIndex;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_TextureArray, vec3(v_UV, float(u_TexIndex)));
  fragColor = mix(u_BaseColor, texColor, u_TexColorWeight);
}
`;

var VOXEL_VS = `#version 300 es
precision highp float;
precision highp int;
precision highp isampler2D;

in uint a_FaceData;

uniform mat4 u_ViewProjection;
uniform isampler2D u_ChunkOrigins;

out vec2 v_UV;
flat out uint v_TexType;
flat out uint v_FaceDir;

const vec2 QUAD[6] = vec2[6](
  vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  vec2(0.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
);

void main() {
  if ((a_FaceData & 0x80000000u) == 0u) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec2 q = QUAD[gl_VertexID];
  v_UV = q;

  uint slot    =  a_FaceData         & 0x3FFu;
  uint local_x = (a_FaceData >> 10u) & 0x1Fu;
  uint local_z = (a_FaceData >> 15u) & 0x1Fu;
  uint y       = (a_FaceData >> 20u) & 0x1Fu;
  uint dir     = (a_FaceData >> 25u) & 0x7u;
  uint tex     = (a_FaceData >> 28u) & 0x3u;

  v_TexType = tex;
  v_FaceDir = dir;

  ivec2 chunkOrigin = texelFetch(u_ChunkOrigins,
    ivec2(int(slot) & 31, int(slot) >> 5), 0).xy;

  vec3 origin = vec3(
    float(chunkOrigin.x * 32 + int(local_x)),
    float(y),
    float(chunkOrigin.y * 32 + int(local_z))
  );

  vec3 localPos;
  if (dir == 0u)      localPos = vec3(1.0, q.y, 1.0 - q.x);
  else if (dir == 1u) localPos = vec3(0.0, q.y, q.x);
  else if (dir == 2u) localPos = vec3(q.x, 1.0, 1.0 - q.y);
  else if (dir == 3u) localPos = vec3(q.x, 0.0, q.y);
  else if (dir == 4u) localPos = vec3(q.x, q.y, 1.0);
  else                localPos = vec3(1.0 - q.x, q.y, 0.0);

  gl_Position = u_ViewProjection * vec4(origin + localPos, 1.0);
}
`;

var VOXEL_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

in vec2 v_UV;
flat in uint v_TexType;
flat in uint v_FaceDir;

uniform sampler2DArray u_TextureArray;

out vec4 fragColor;

const float SHADE[6] = float[6](0.85, 0.85, 1.00, 0.55, 0.92, 0.92);

void main() {
  vec4 c = texture(u_TextureArray, vec3(v_UV, float(v_TexType)));
  c.rgb *= SHADE[v_FaceDir];
  fragColor = c;
}
`;


var gl;
var canvas;

var mesh  = {};
var voxel = {};

var camera;
var world;
var textureArray;

var g_keys = {};
var g_lastFrameMs = 0;
var g_time = 0;
var g_fps = 0;

var MOVE_SPEED = 1.5;
var TURN_SPEED = 2.5;
var MOUSE_SENS = 0.15;

var g_currentTex = TEX_WALL;

var TEXTURE_SIZE   = 256;
var TEXTURE_LAYERS = 4;
var TEXTURE_SOURCES = [
	"textures/grass.png",
	"textures/wall.png",
	"textures/dirt.png",
	"textures/stone.png",
];

var g_vp = new Matrix4();


function main() {
	setupWebGL();
	initPrograms();
	initTextureArray();

	camera = new Camera(canvas);
	world  = new World();

	camera.eye = new Vector3([0, MAX_HEIGHT + 12, 60]);
	camera.at  = new Vector3([0, MAX_HEIGHT +  6,  0]);
	camera.updateView();

	hookInput();

	gl.clearColor(0.5, 0.7, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	requestAnimationFrame(tick);
}


function setupWebGL() {
	canvas = document.getElementById("webgl");
	gl = canvas.getContext("webgl2", { antialias: true });

	if (!gl) {
		alert("WebGL 2 is required for this app. Please use a modern browser.");
		throw new Error("WebGL 2 not available");
	}
}


function initPrograms() {
	const meshProgram = createProgram(MESH_VS, MESH_FS, { a_Position: 0, a_UV: 1 });

	mesh = {
		program:          meshProgram,
		a_Position:       gl.getAttribLocation(meshProgram, "a_Position"),
		a_UV:             gl.getAttribLocation(meshProgram, "a_UV"),
		u_ModelMatrix:    gl.getUniformLocation(meshProgram, "u_ModelMatrix"),
		u_ViewProjection: gl.getUniformLocation(meshProgram, "u_ViewProjection"),
		u_BaseColor:      gl.getUniformLocation(meshProgram, "u_BaseColor"),
		u_TexColorWeight: gl.getUniformLocation(meshProgram, "u_TexColorWeight"),
		u_TexIndex:       gl.getUniformLocation(meshProgram, "u_TexIndex"),
		u_TextureArray:   gl.getUniformLocation(meshProgram, "u_TextureArray"),
	};

	const voxelProgram = createProgram(VOXEL_VS, VOXEL_FS, { a_FaceData: 2 });

	voxel = {
		program:          voxelProgram,
		a_FaceData:       gl.getAttribLocation(voxelProgram, "a_FaceData"),
		u_ViewProjection: gl.getUniformLocation(voxelProgram, "u_ViewProjection"),
		u_TextureArray:   gl.getUniformLocation(voxelProgram, "u_TextureArray"),
		u_ChunkOrigins:   gl.getUniformLocation(voxelProgram, "u_ChunkOrigins"),
	};

	gl.useProgram(mesh.program);
	gl.uniform1i(mesh.u_TextureArray, 0);

	gl.useProgram(voxel.program);
	gl.uniform1i(voxel.u_TextureArray, 0);
	gl.uniform1i(voxel.u_ChunkOrigins, 1);
}


function initTextureArray() {
	textureArray = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);

	const mipLevels = Math.floor(Math.log2(TEXTURE_SIZE)) + 1;
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, mipLevels, gl.RGBA8,
		TEXTURE_SIZE, TEXTURE_SIZE, TEXTURE_LAYERS);

	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);

	const fallbackColors = [
		[ 60, 140,  60, 255],
		[160,  90,  60, 255],
		[120,  80,  50, 255],
		[120, 120, 120, 255],
	];

	for (let i = 0; i < TEXTURE_LAYERS; i++) {
		const c = fallbackColors[i];
		const px = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);

		for (let p = 0; p < px.length; p += 4) {
			px[p    ] = c[0];
			px[p + 1] = c[1];
			px[p + 2] = c[2];
			px[p + 3] = c[3];
		}

		gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i,
			TEXTURE_SIZE, TEXTURE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
	}

	gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

	let loaded = 0;

	TEXTURE_SOURCES.forEach((url, i) => {
		const img = new Image();

		img.onload = () => {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

			gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i,
				TEXTURE_SIZE, TEXTURE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, img);

			loaded++;
			if (loaded === TEXTURE_LAYERS) gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
		};

		img.onerror = () => console.log("texture failed:", url);
		img.src = url;
	});
}


function hookInput() {
	document.addEventListener("keydown", (ev) => {
		g_keys[ev.code] = true;

		if (ev.code === "Digit1") g_currentTex = TEX_GRASS;
		if (ev.code === "Digit2") g_currentTex = TEX_WALL;
		if (ev.code === "Digit3") g_currentTex = TEX_DIRT;
		if (ev.code === "Digit4") g_currentTex = TEX_STONE;
	});

	document.addEventListener("keyup", (ev) => { g_keys[ev.code] = false; });

	canvas.addEventListener("click", () => {
		if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
	});

	document.addEventListener("mousemove", (ev) => {
		if (document.pointerLockElement !== canvas) return;

		if (ev.movementX) camera.panRight(ev.movementX * MOUSE_SENS);
		if (ev.movementY) camera.panDown(ev.movementY * MOUSE_SENS);
	});

	canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

	canvas.addEventListener("mousedown", (ev) => {
		if (document.pointerLockElement !== canvas) return;

		const target = blockInFront();
		if (!target) return;

		if (ev.button === 0)      world.addBlock(target.x, target.z, g_currentTex);
		else if (ev.button === 2) world.deleteBlock(target.x, target.z);
	});
}


function blockInFront() {
	const f = camera.forwardVec();
	const reach = 1.8;

	const px = camera.eye.elements[0] + f.elements[0] * reach;
	const pz = camera.eye.elements[2] + f.elements[2] * reach;

	const x = Math.floor(px);
	const z = Math.floor(pz);

	if (!world.inBounds(x, z)) return null;
	return { x, z };
}


function processKeys() {
	if (g_keys["KeyW"]) camera.moveForward(MOVE_SPEED);
	if (g_keys["KeyS"]) camera.moveBackwards(MOVE_SPEED);
	if (g_keys["KeyA"]) camera.moveLeft(MOVE_SPEED);
	if (g_keys["KeyD"]) camera.moveRight(MOVE_SPEED);

	if (g_keys["KeyQ"]) camera.panLeft(TURN_SPEED);
	if (g_keys["KeyE"]) camera.panRight(TURN_SPEED);

	if (g_keys["Space"]) camera.moveUp(MOVE_SPEED);
	if (g_keys["ShiftLeft"] || g_keys["ShiftRight"]) camera.moveDown(MOVE_SPEED);
}


function tick(nowMs) {
	const dt = g_lastFrameMs ? nowMs - g_lastFrameMs : 16;

	g_lastFrameMs = nowMs;
	g_time = nowMs / 1000;

	processKeys();

	world.updateChunks(camera);
	world.processLoadQueue();

	updateFps(dt);
	renderScene();

	requestAnimationFrame(tick);
}


function updateFps(dtMs) {
	const inst = 1000 / Math.max(dtMs, 0.001);
	g_fps = g_fps * 0.9 + inst * 0.1;

	const el = document.getElementById("perf");
	if (el) el.innerText = "FPS: " + g_fps.toFixed(0) + " | frame: " + dtMs.toFixed(1) + " ms";
}


function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	g_vp.set(camera.projectionMatrix);
	g_vp.multiply(camera.viewMatrix);

	gl.useProgram(mesh.program);
	gl.uniformMatrix4fv(mesh.u_ViewProjection, false, g_vp.elements);

	gl.useProgram(voxel.program);
	gl.uniformMatrix4fv(voxel.u_ViewProjection, false, g_vp.elements);

	world.render(g_time);
}


function createProgram(vshader, fshader, attribLocations) {
	const vs = loadShader(gl.VERTEX_SHADER, vshader);
	const fs = loadShader(gl.FRAGMENT_SHADER, fshader);

	if (!vs || !fs) return null;

	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);

	if (attribLocations) {
		for (const name in attribLocations) {
			gl.bindAttribLocation(program, attribLocations[name], name);
		}
	}

	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log("Program link failed:", gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}

	return program;
}


function loadShader(type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log("Shader compile failed:", gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}


main();
