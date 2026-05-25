var LIGHTING_GLSL = `
uniform int  u_LightingOn;
uniform int  u_NormalVis;
uniform vec3 u_CameraPos;

uniform int  u_PointOn;
uniform vec3 u_PointPos;
uniform vec3 u_PointColor;

uniform int  u_SpotOn;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;
uniform vec3 u_SpotColor;
uniform float u_SpotCosCutoff;
uniform float u_SpotExp;

vec3 phong(vec3 N, vec3 V, vec3 L, vec3 lightColor, vec3 baseColor, float atten, float shininess, float specStrength) {
  vec3 R = reflect(-L, N);
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(R, V), 0.0), shininess);
  return (diff * baseColor * lightColor + spec * specStrength * lightColor) * atten;
}

vec3 applyLights(vec3 base, vec3 N, vec3 worldPos, float ambientK, float shininess, float specStrength) {
  vec3 V = normalize(u_CameraPos - worldPos);
  vec3 color = ambientK * base;

  if (u_PointOn == 1) {
    vec3 toLight = u_PointPos - worldPos;
    float dist = length(toLight);
    vec3 L = toLight / max(dist, 0.0001);
    float atten = 1.0 / (1.0 + 0.012 * dist + 0.0008 * dist * dist);
    color += phong(N, V, L, u_PointColor, base, atten, shininess, specStrength);
  }

  if (u_SpotOn == 1) {
    vec3 toLight = u_SpotPos - worldPos;
    float dist = length(toLight);
    vec3 L = toLight / max(dist, 0.0001);
    float cosAngle = dot(-L, normalize(u_SpotDir));
    if (cosAngle > u_SpotCosCutoff) {
      float falloff = pow(cosAngle, u_SpotExp);
      float atten = falloff / (1.0 + 0.008 * dist + 0.0004 * dist * dist);
      color += phong(N, V, L, u_SpotColor, base, atten, shininess, specStrength);
    }
  }
  return color;
}
`;

var MESH_VS = `#version 300 es
precision highp float;

in vec4 a_Position;
in vec3 a_Normal;
in vec2 a_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ViewProjection;

out vec3 v_WorldPos;
out vec3 v_Normal;
out vec2 v_UV;

void main() {
  vec4 worldPos = u_ModelMatrix * a_Position;
  gl_Position = u_ViewProjection * worldPos;
  v_WorldPos = worldPos.xyz;
  v_Normal   = mat3(u_NormalMatrix) * a_Normal;
  v_UV       = a_UV;
}
`;

var MESH_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec3 v_WorldPos;
in vec3 v_Normal;
in vec2 v_UV;

uniform sampler2DArray u_TextureArray;
uniform vec4  u_BaseColor;
uniform float u_TexColorWeight;
uniform int   u_TexIndex;
uniform int   u_Emissive;
` + LIGHTING_GLSL + `
out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_TextureArray, vec3(v_UV, float(u_TexIndex)));
  vec4 surf = mix(u_BaseColor, texColor, u_TexColorWeight);
  vec3 N = normalize(v_Normal);

  if (u_NormalVis == 1) { fragColor = vec4(N * 0.5 + 0.5, 1.0); return; }
  if (u_Emissive == 1 || u_LightingOn == 0) { fragColor = surf; return; }

  if (dot(N, normalize(u_CameraPos - v_WorldPos)) < 0.0) N = -N;
  fragColor = vec4(applyLights(surf.rgb, N, v_WorldPos, 0.18, 32.0, 0.8), surf.a);
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
out vec3 v_WorldPos;
out vec3 v_Normal;
flat out uint v_TexType;

const vec2 QUAD[6] = vec2[6](
  vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  vec2(0.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
);

const vec3 FACE_NORMAL[6] = vec3[6](
  vec3( 1, 0,  0), vec3(-1, 0,  0),
  vec3( 0, 1,  0), vec3( 0,-1,  0),
  vec3( 0, 0,  1), vec3( 0, 0, -1)
);

void main() {
  if ((a_FaceData & 0x80000000u) == 0u) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec2 q = QUAD[gl_VertexID];
  uint slot    =  a_FaceData         & 0x3FFu;
  uint local_x = (a_FaceData >> 10u) & 0x1Fu;
  uint local_z = (a_FaceData >> 15u) & 0x1Fu;
  uint y       = (a_FaceData >> 20u) & 0x1Fu;
  uint dir     = (a_FaceData >> 25u) & 0x7u;
  uint tex     = (a_FaceData >> 28u) & 0x3u;

  v_UV = q;
  v_TexType = tex;
  v_Normal  = FACE_NORMAL[dir];

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

  v_WorldPos = origin + localPos;
  gl_Position = u_ViewProjection * vec4(v_WorldPos, 1.0);
}
`;

var VOXEL_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

in vec2 v_UV;
in vec3 v_WorldPos;
in vec3 v_Normal;
flat in uint v_TexType;

uniform sampler2DArray u_TextureArray;
` + LIGHTING_GLSL + `
out vec4 fragColor;

void main() {
  vec4 c = texture(u_TextureArray, vec3(v_UV, float(v_TexType)));
  vec3 N = normalize(v_Normal);

  if (u_NormalVis == 1) { fragColor = vec4(N * 0.5 + 0.5, 1.0); return; }
  if (u_LightingOn == 0) { fragColor = c; return; }

  fragColor = vec4(applyLights(c.rgb, N, v_WorldPos, 0.22, 24.0, 0.35), c.a);
}
`;


var gl;
var canvas;
var mesh;
var voxel;

var camera;
var world;
var knotModel;
var textureArray;

var g_keys = {};
var g_lastFrameMs = 0;
var g_time = 0;
var g_fps = 0;

var MOVE_SPEED = 1.5;
var TURN_SPEED = 2.5;
var MOUSE_SENS = 0.15;

var g_currentTex = TEX_WALL;

var TEXTURE_SIZE = 256;
var TEXTURE_SOURCES = [
	"textures/grass.png",
	"textures/wall.png",
	"textures/dirt.png",
	"textures/stone.png",
];

var g_vp = new Matrix4();
var g_tmpNormal = new Matrix4();

var g_lighting = {
	on: true,
	normalVis: false,

	pointOn: true,
	pointAnim: true,
	pointPos: [0, 12, 0],
	pointColor: [1, 1, 1],

	spotOn: true,
	spotPos: [0, 18, 0],
	spotDir: [0, -1, 0],
	spotColor: [1.0, 0.92, 0.66],
	spotCutoffDeg: 18,
	spotExp: 32,
};


function main() {
	canvas = document.getElementById("webgl");
	gl = canvas.getContext("webgl2", { antialias: true });
	if (!gl) { alert("WebGL 2 is required."); throw new Error("WebGL 2 not available"); }

	mesh  = makeProgram(MESH_VS, MESH_FS, { a_Position: 0, a_Normal: 1, a_UV: 2 });
	voxel = makeProgram(VOXEL_VS, VOXEL_FS, { a_FaceData: 3 });

	initTextureArray();
	gl.useProgram(mesh.program);  gl.uniform1i(mesh.u_TextureArray, 0);
	gl.useProgram(voxel.program); gl.uniform1i(voxel.u_TextureArray, 0);
	gl.uniform1i(voxel.u_ChunkOrigins, 1);

	camera = new Camera(canvas);
	world  = new World();
	knotModel = new Model("models/torusknot.obj");

	camera.eye = new Vector3([14, 11, 18]);
	camera.at  = new Vector3([0, 6, 0]);
	camera.updateView();

	hookInput();
	hookUI();

	gl.clearColor(0.5, 0.7, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	requestAnimationFrame(tick);
}


function makeProgram(vsSrc, fsSrc, attribLocs) {
	const compile = (type, src) => {
		const s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
			throw new Error("Shader compile failed: " + gl.getShaderInfoLog(s));
		return s;
	};

	const program = gl.createProgram();
	gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSrc));
	gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSrc));
	if (attribLocs) for (const n in attribLocs) gl.bindAttribLocation(program, attribLocs[n], n);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		throw new Error("Program link failed: " + gl.getProgramInfoLog(program));

	const obj = { program };
	const nAttrs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	for (let i = 0; i < nAttrs; i++) {
		const name = gl.getActiveAttrib(program, i).name;
		obj[name] = gl.getAttribLocation(program, name);
	}
	const nUnis = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	for (let i = 0; i < nUnis; i++) {
		const name = gl.getActiveUniform(program, i).name;
		obj[name] = gl.getUniformLocation(program, name);
	}
	return obj;
}


function initTextureArray() {
	textureArray = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);

	const mipLevels = Math.floor(Math.log2(TEXTURE_SIZE)) + 1;
	gl.texStorage3D(gl.TEXTURE_2D_ARRAY, mipLevels, gl.RGBA8,
		TEXTURE_SIZE, TEXTURE_SIZE, TEXTURE_SOURCES.length);

	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);

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
			if (++loaded === TEXTURE_SOURCES.length) gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
		};
		img.onerror = () => console.log("texture failed:", url);
		img.src = url;
	});
}


function hookInput() {
	document.addEventListener("keydown", (ev) => {
		if (ev.target.tagName === "INPUT") return;
		g_keys[ev.code] = true;
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
}


function hookUI() {
	const $ = (id) => document.getElementById(id);

	const toggle = (id, prop, label) => {
		const btn = $(id);
		btn.addEventListener("click", () => {
			g_lighting[prop] = !g_lighting[prop];
			btn.textContent = `${label}: ${g_lighting[prop] ? "ON" : "OFF"}`;
			btn.classList.toggle("on", g_lighting[prop]);
		});
	};

	toggle("btnLighting",  "on",        "Lighting");
	toggle("btnNormals",   "normalVis", "Normals");
	toggle("btnPoint",     "pointOn",   "Point");
	toggle("btnPointAnim", "pointAnim", "Animate");
	toggle("btnSpot",      "spotOn",    "Spot");

	["lightX", "lightY", "lightZ"].forEach((id, axis) => {
		$(id).addEventListener("input", () => {
			const v = parseFloat($(id).value);
			g_lighting.pointPos[axis] = v;
			$(id + "v").textContent = v.toFixed(1);
			if (g_lighting.pointAnim) $("btnPointAnim").click();
		});
	});

	$("lightColor").addEventListener("input", (e) => g_lighting.pointColor = hexToRgb(e.target.value));
	$("spotColor").addEventListener("input",  (e) => g_lighting.spotColor  = hexToRgb(e.target.value));
	$("spotCut").addEventListener("input", (e) => {
		g_lighting.spotCutoffDeg = parseFloat(e.target.value);
		$("spotCutv").textContent = g_lighting.spotCutoffDeg.toFixed(1);
	});
}


function hexToRgb(hex) {
	return [1, 3, 5].map((i) => parseInt(hex.substring(i, i + 2), 16) / 255);
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
	animateLight(g_time);

	world.updateChunks(camera);
	world.processLoadQueue();

	updateFps(dt);
	renderScene();

	requestAnimationFrame(tick);
}


function animateLight(t) {
	if (g_lighting.pointAnim) {
		const r = 11;
		g_lighting.pointPos = [Math.cos(t * 0.6) * r, 11 + Math.sin(t * 0.9) * 4, Math.sin(t * 0.6) * r];

		["lightX", "lightY", "lightZ"].forEach((id, axis) => {
			const v = g_lighting.pointPos[axis].toFixed(1);
			document.getElementById(id).value = v;
			document.getElementById(id + "v").textContent = v;
		});
	}

	g_lighting.spotDir = [Math.sin(t * 0.5) * 0.3, -1.0, Math.cos(t * 0.5) * 0.3];
}


function updateFps(dtMs) {
	g_fps = g_fps * 0.9 + (1000 / Math.max(dtMs, 0.001)) * 0.1;
	const el = document.getElementById("perf");
	if (el) el.innerText = `FPS: ${g_fps.toFixed(0)} | frame: ${dtMs.toFixed(1)} ms`;
}


function uploadLightingUniforms(prog) {
	const L = g_lighting;
	gl.uniform1i(prog.u_LightingOn, L.on ? 1 : 0);
	gl.uniform1i(prog.u_NormalVis,  L.normalVis ? 1 : 0);
	gl.uniform3fv(prog.u_CameraPos, camera.eye.elements);

	gl.uniform1i(prog.u_PointOn, L.pointOn ? 1 : 0);
	gl.uniform3fv(prog.u_PointPos, L.pointPos);
	gl.uniform3fv(prog.u_PointColor, L.pointColor);

	gl.uniform1i(prog.u_SpotOn, L.spotOn ? 1 : 0);
	gl.uniform3fv(prog.u_SpotPos, L.spotPos);
	gl.uniform3fv(prog.u_SpotDir, L.spotDir);
	gl.uniform3fv(prog.u_SpotColor, L.spotColor);
	gl.uniform1f(prog.u_SpotCosCutoff, Math.cos(L.spotCutoffDeg * Math.PI / 180));
	gl.uniform1f(prog.u_SpotExp, L.spotExp);
}


function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	g_vp.set(camera.projectionMatrix).multiply(camera.viewMatrix);

	gl.useProgram(mesh.program);
	gl.uniformMatrix4fv(mesh.u_ViewProjection, false, g_vp.elements);
	uploadLightingUniforms(mesh);

	gl.useProgram(voxel.program);
	gl.uniformMatrix4fv(voxel.u_ViewProjection, false, g_vp.elements);
	uploadLightingUniforms(voxel);

	world.render(g_time);

	gl.useProgram(mesh.program);
	renderDemoObjects(g_time);
	renderLightMarkers();
}


function renderDemoObjects(t) {
	const groundY = 4;

	let m = new Matrix4().translate(-7, groundY + 3, 0).scale(3, 3, 3);
	drawSphere(m, [0.85, 0.25, 0.25, 1.0]);

	m = new Matrix4().translate(7, groundY + 2, -4).scale(2, 2, 2);
	drawSphere(m, [0.25, 0.45, 0.9, 1.0]);

	m = new Matrix4().translate(0, groundY + 1.25, -7).rotate(t * 20, 0, 1, 0)
		.scale(2.5, 2.5, 2.5).translate(-0.5, -0.5, -0.5);
	drawCube(m, [0.35, 0.75, 0.4, 1.0], 0.0, 0);

	m = new Matrix4().translate(0, groundY + 4, 7).rotate(t * 15, 0, 1, 0).scale(1.4, 1.4, 1.4);
	knotModel.draw(m, [0.9, 0.7, 0.3, 1.0]);
}


function renderLightMarkers() {
	const marker = (pos, scaleY, color, on) => {
		if (!on) return;
		const m = new Matrix4().translate(pos[0], pos[1], pos[2])
			.scale(0.6, scaleY, 0.6).translate(-0.5, -0.5, -0.5);
		drawEmissiveCube(m, [color[0], color[1], color[2], 1.0]);
	};
	marker(g_lighting.pointPos, 0.6, g_lighting.pointColor, g_lighting.pointOn);
	marker(g_lighting.spotPos,  0.4, g_lighting.spotColor,  g_lighting.spotOn);
}


function setNormalMatrix(modelMatrix) {
	g_tmpNormal.setInverseOf(modelMatrix).transpose();
	gl.uniformMatrix4fv(mesh.u_NormalMatrix, false, g_tmpNormal.elements);
}


function drawEmissiveCube(matrix, color) {
	gl.uniform1i(mesh.u_Emissive, 1);
	drawCube(matrix, color, 0.0, 0);
	gl.uniform1i(mesh.u_Emissive, 0);
}


function bindAttrib(buffer, loc, size) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(loc);
}


main();
