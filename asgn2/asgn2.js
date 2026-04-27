var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute float a_Shade;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  varying float v_Shade;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
    v_Shade = a_Shade;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  varying float v_Shade;
  void main() {
    gl_FragColor = vec4(u_FragColor.rgb * v_Shade, u_FragColor.a);
  }`;

var gl;
var canvas;
var a_Position;
var a_Shade;
var u_ModelMatrix;
var u_GlobalRotation;
var u_FragColor;

var g_time = 0;
var g_lastFrameMs = 0;
var g_fps = 0;

var g_globalRotY = 0;
var g_globalRotX = 10;
var g_mouseRotY = 0;
var g_mouseRotX = 0;

var g_animationOn = false;
var g_pokeStart = -1;
var POKE_DURATION = 1.5;

var g_shoulderAngle = 0;
var g_forearmAngle = 0;
var g_tipAngle = 0;
var g_headAngle = 0;

var g_mouseDragging = false;
var g_lastMouseX = 0;
var g_lastMouseY = 0;

function main() {
	setupWebGL();
	connectVariablesToGLSL();
	hookUI();

	gl.clearColor(0.04, 0.04, 0.10, 1.0);
	gl.enable(gl.DEPTH_TEST);

	requestAnimationFrame(tick);
}

function setupWebGL() {
	canvas = document.getElementById("webgl");
	gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

	if (!gl) {
		console.log("Failed to get the rendering context for WebGL");
		return;
	}
}

function connectVariablesToGLSL() {
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log("Failed to initialize shaders.");
		return;
	}

	a_Position = gl.getAttribLocation(gl.program, "a_Position");
	a_Shade = gl.getAttribLocation(gl.program, "a_Shade");
	u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
	u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
	u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
}

function hookUI() {
	bindSlider("globalRotSlider", "globalRotVal", function (v) {
		g_globalRotY = v;
	});
	bindSlider("globalRotXSlider", "globalRotXVal", function (v) {
		g_globalRotX = v;
	});
	bindSlider("shoulderSlider", "shoulderVal", function (v) {
		g_shoulderAngle = v;
	});
	bindSlider("forearmSlider", "forearmVal", function (v) {
		g_forearmAngle = v;
	});
	bindSlider("tipSlider", "tipVal", function (v) {
		g_tipAngle = v;
	});
	bindSlider("headSlider", "headVal", function (v) {
		g_headAngle = v;
	});

	document.getElementById("btnAnimOn").onclick = function () {
		g_animationOn = true;
	};
	document.getElementById("btnAnimOff").onclick = function () {
		g_animationOn = false;
	};

	canvas.onmousedown = function (ev) {
		if (ev.shiftKey) {
			g_pokeStart = g_time;
			return;
		}

		g_mouseDragging = true;
		g_lastMouseX = ev.clientX;
		g_lastMouseY = ev.clientY;
	};

	window.onmouseup = function () {
		g_mouseDragging = false;
	};

	window.onmousemove = function (ev) {
		if (!g_mouseDragging) return;

		var dx = ev.clientX - g_lastMouseX;
		var dy = ev.clientY - g_lastMouseY;

		g_mouseRotY += dx * 0.5;
		g_mouseRotX += dy * 0.5;

		if (g_mouseRotX > 90) g_mouseRotX = 90;
		if (g_mouseRotX < -90) g_mouseRotX = -90;

		g_lastMouseX = ev.clientX;
		g_lastMouseY = ev.clientY;
	};
}

function bindSlider(sliderId, valueId, setter) {
	var slider = document.getElementById(sliderId);
	var valEl = document.getElementById(valueId);

	var apply = function () {
		var v = parseFloat(slider.value);
		setter(v);
		valEl.innerText = v;
	};

	slider.oninput = apply;
	apply();
}

function tick(nowMs) {
	var nowSec = nowMs / 1000;
	var dt = g_lastFrameMs ? nowMs - g_lastFrameMs : 16;

	g_lastFrameMs = nowMs;
	g_time = nowSec;

	updateFps(dt);
	renderScene();

	requestAnimationFrame(tick);
}

function updateFps(dtMs) {
	var instFps = 1000 / Math.max(dtMs, 0.001);

	g_fps = g_fps * 0.9 + instFps * 0.1;

	var el = document.getElementById("performanceDisplay");

	if (el) {
		el.innerText =
			"FPS: " + g_fps.toFixed(0) + " | frame: " + dtMs.toFixed(1) + " ms";
	}
}

function updateAnimationAngles() {
	var t = g_time;

	var shoulder = g_shoulderAngle;
	var forearm = g_forearmAngle;
	var tip = g_tipAngle;
	var head = g_headAngle;
	var bodyBob = 0;
	var earL = 0;
	var earR = 0;
	var tailWag = 0;
	var bodyTilt = 0;

	if (g_animationOn) {
		shoulder = Math.sin(t * 5) * 45;
		forearm = 30 + Math.sin(t * 5 + 0.6) * 30;
		tip = 20 + Math.sin(t * 5 + 1.2) * 25;
		head = Math.sin(t * 2.5) * 12;
		bodyBob = Math.sin(t * 5) * 0.08;
		earL = Math.sin(t * 3) * 15;
		earR = -Math.sin(t * 3) * 15;
		tailWag = Math.sin(t * 4) * 25;
		bodyTilt = Math.sin(t * 2.5) * 4;
	}

	if (g_pokeStart >= 0) {
		var pt = t - g_pokeStart;

		if (pt > POKE_DURATION) {
			g_pokeStart = -1;
		} else {
			var k = pt / POKE_DURATION;
			var fade = 1 - k;
			var fast = Math.sin(pt * 25);

			shoulder = fast * 70 * fade;
			forearm = (50 + fast * 40) * fade;
			tip = (60 + Math.sin(pt * 30) * 30) * fade;
			head = Math.sin(pt * 12) * 30;
			earL = Math.sin(pt * 14) * 35;
			earR = -Math.sin(pt * 14) * 35;
			tailWag = Math.sin(pt * 18) * 60;
			bodyBob = 0.25 * Math.sin(pt * 8);
			bodyTilt = pt * 720;
		}
	}

	return {
		shoulder: shoulder,
		forearm: forearm,
		tip: tip,
		head: head,
		bodyBob: bodyBob,
		earL: earL,
		earR: earR,
		tailWag: tailWag,
		bodyTilt: bodyTilt,
	};
}

function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var G = new Matrix4();
	G.rotate(g_globalRotX + g_mouseRotX, 1, 0, 0);
	G.rotate(g_globalRotY + g_mouseRotY, 0, 1, 0);
	gl.uniformMatrix4fv(u_GlobalRotation, false, G.elements);

	var a = updateAnimationAngles();

	drawBat(a);
}

var COLOR_BODY_DARK = [0.25, 0.18, 0.30, 1.0];
var COLOR_BODY_MID = [0.40, 0.30, 0.45, 1.0];
var COLOR_WING_DARK = [0.18, 0.12, 0.22, 1.0];
var COLOR_WING_MID = [0.30, 0.22, 0.36, 1.0];
var COLOR_EAR = [0.55, 0.32, 0.40, 1.0];
var COLOR_EYE = [1.0, 0.25, 0.25, 1.0];
var COLOR_FANG = [0.95, 0.95, 0.85, 1.0];
var COLOR_FOOT = [0.30, 0.20, 0.25, 1.0];

function drawBox(parentM, cx, cy, cz, sx, sy, sz, color) {
	var M = new Matrix4(parentM);
	M.translate(cx - sx / 2, cy - sy / 2, cz - sz / 2);
	M.scale(sx, sy, sz);
	drawCube(M, color);
}

function drawBat(a) {
	var root = new Matrix4();
	root.scale(0.7, 0.7, 0.7);
	root.translate(0, a.bodyBob, 0);
	root.rotate(a.bodyTilt, 0, 0, 1);

	drawBox(root, 0, 0, 0, 0.6, 0.45, 0.45, COLOR_BODY_DARK);
	drawBox(root, 0, -0.02, -0.18, 0.35, 0.30, 0.12, COLOR_BODY_MID);

	var headM = new Matrix4(root);
	headM.translate(0, 0.20, -0.10);
	headM.rotate(a.head, 1, 0, 0);

	drawBox(headM, 0, 0.10, -0.05, 0.40, 0.35, 0.40, COLOR_BODY_DARK);
	drawBox(headM, 0, 0.04, -0.27, 0.20, 0.16, 0.15, COLOR_BODY_MID);
	drawBox(headM, -0.10, 0.16, -0.28, 0.06, 0.06, 0.04, COLOR_EYE);
	drawBox(headM, 0.10, 0.16, -0.28, 0.06, 0.06, 0.04, COLOR_EYE);
	drawBox(headM, -0.04, -0.07, -0.30, 0.03, 0.08, 0.03, COLOR_FANG);
	drawBox(headM, 0.04, -0.07, -0.30, 0.03, 0.08, 0.03, COLOR_FANG);

	var earLM = new Matrix4(headM);
	earLM.translate(-0.13, 0.27, -0.02);
	earLM.rotate(a.earL, 0, 0, 1);
	drawBox(earLM, 0, 0.08, 0, 0.10, 0.20, 0.08, COLOR_EAR);

	var earRM = new Matrix4(headM);
	earRM.translate(0.13, 0.27, -0.02);
	earRM.rotate(-a.earR, 0, 0, 1);
	drawBox(earRM, 0, 0.08, 0, 0.10, 0.20, 0.08, COLOR_EAR);

	var rShoulder = new Matrix4(root);
	rShoulder.translate(0.30, 0.10, 0);
	rShoulder.rotate(a.shoulder, 0, 0, 1);
	rShoulder.rotate(20, 0, 1, 0);
	drawBox(rShoulder, 0.275, 0, 0, 0.55, 0.04, 0.35, COLOR_WING_DARK);

	var rForearm = new Matrix4(rShoulder);
	rForearm.translate(0.55, 0, 0);
	rForearm.rotate(-a.forearm, 0, 0, 1);
	drawBox(rForearm, 0.25, 0, 0.05, 0.50, 0.04, 0.40, COLOR_WING_MID);

	var rTip = new Matrix4(rForearm);
	rTip.translate(0.50, 0, 0);
	rTip.rotate(-a.tip, 0, 0, 1);
	drawBox(rTip, 0.18, 0, 0.10, 0.36, 0.04, 0.30, COLOR_WING_DARK);
	drawBox(rTip, 0.18, 0.045, 0.10, 0.36, 0.03, 0.03, COLOR_BODY_MID);

	var lShoulder = new Matrix4(root);
	lShoulder.translate(-0.30, 0.10, 0);
	lShoulder.rotate(-a.shoulder, 0, 0, 1);
	lShoulder.rotate(-20, 0, 1, 0);
	drawBox(lShoulder, -0.275, 0, 0, 0.55, 0.04, 0.35, COLOR_WING_DARK);

	var lForearm = new Matrix4(lShoulder);
	lForearm.translate(-0.55, 0, 0);
	lForearm.rotate(a.forearm, 0, 0, 1);
	drawBox(lForearm, -0.25, 0, 0.05, 0.50, 0.04, 0.40, COLOR_WING_MID);

	var lTip = new Matrix4(lForearm);
	lTip.translate(-0.50, 0, 0);
	lTip.rotate(a.tip, 0, 0, 1);
	drawBox(lTip, -0.18, 0, 0.10, 0.36, 0.04, 0.30, COLOR_WING_DARK);
	drawBox(lTip, -0.18, 0.045, 0.10, 0.36, 0.03, 0.03, COLOR_BODY_MID);

	var tailM = new Matrix4(root);
	tailM.translate(0, -0.10, 0.20);
	tailM.rotate(a.tailWag, 0, 1, 0);
	drawBox(tailM, 0, 0, 0.10, 0.08, 0.08, 0.20, COLOR_BODY_MID);

	var lFoot = new Matrix4(root);
	lFoot.translate(-0.10, -0.42, 0.05);
	lFoot.scale(0.10, 0.22, 0.10);
	drawCylinder(lFoot, COLOR_FOOT);

	var rFoot = new Matrix4(root);
	rFoot.translate(0.10, -0.42, 0.05);
	rFoot.scale(0.10, 0.22, 0.10);
	drawCylinder(rFoot, COLOR_FOOT);
}

function initShaders(gl, vshader, fshader) {
	var program = createProgram(gl, vshader, fshader);

	if (!program) {
		console.log("Failed to create program");
		return false;
	}

	gl.useProgram(program);
	gl.program = program;

	return true;
}

function createProgram(gl, vshader, fshader) {
	var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader);
	var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader);

	if (!vertexShader || !fragmentShader) return null;

	var program = gl.createProgram();

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	var linked = gl.getProgramParameter(program, gl.LINK_STATUS);

	if (!linked) {
		var error = gl.getProgramInfoLog(program);

		console.log("Failed to link program: " + error);

		gl.deleteProgram(program);
		gl.deleteShader(fragmentShader);
		gl.deleteShader(vertexShader);

		return null;
	}

	return program;
}

function loadShader(gl, type, source) {
	var shader = gl.createShader(type);

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

	if (!compiled) {
		var error = gl.getShaderInfoLog(shader);

		console.log("Failed to compile shader: " + error);

		gl.deleteShader(shader);

		return null;
	}

	return shader;
}

main();
