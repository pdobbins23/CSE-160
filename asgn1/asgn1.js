var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var g_shapesList = [];
var g_selectedType = "point";
var g_rainbowMode = false;
var g_sprayMode = false;
var g_rainbowHue = 0;

function main() {
	setupWebGL();
	connectVariablesToGLSL();
	handleClicks();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
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
	if (a_Position < 0) {
		console.log("Failed to get the storage location of a_Position");
		return;
	}

	u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
	if (!u_FragColor) {
		console.log("Failed to get the storage location of u_FragColor");
		return;
	}

	u_Size = gl.getUniformLocation(gl.program, "u_Size");
	if (!u_Size) {
		console.log("Failed to get the storage location of u_Size");
		return;
	}
}

function handleClicks() {
	canvas.onmousedown = function (ev) {
		click(ev);
	};
	canvas.onmousemove = function (ev) {
		if (ev.buttons === 1) {
			click(ev);
		}
	};
}

function click(ev) {
	var [x, y] = convertCoordinatesEventToGL(ev);

	if (g_sprayMode) {
		for (var i = 0; i < 5; i++) {
			var spread =
				parseFloat(document.getElementById("sizeSlider").value) / 200.0;
			var sx = x + (Math.random() - 0.5) * spread;
			var sy = y + (Math.random() - 0.5) * spread;

			var p = new Point();
			p.position = [sx, sy];
			p.color = getCurrentColor();
			p.size = 2 + Math.random() * 3;

			g_shapesList.push(p);
		}
	} else {
		var shape;

		if (g_selectedType === "point") {
			shape = new Point();
		} else if (g_selectedType === "triangle") {
			shape = new Triangle();
		} else if (g_selectedType === "circle") {
			shape = new Circle();
			shape.segments = parseInt(document.getElementById("segSlider").value);
		}

		shape.position = [x, y];
		shape.color = getCurrentColor();
		shape.size = parseFloat(document.getElementById("sizeSlider").value);

		g_shapesList.push(shape);
	}

	renderAllShapes();
}

function getCurrentColor() {
	if (g_rainbowMode) {
		g_rainbowHue = (g_rainbowHue + 5) % 360;
		return hslToRgba(g_rainbowHue, 1.0, 0.5);
	}

	var r = parseFloat(document.getElementById("redSlider").value);
	var g = parseFloat(document.getElementById("greenSlider").value);
	var b = parseFloat(document.getElementById("blueSlider").value);
	var a = parseFloat(document.getElementById("alphaSlider").value);

	return [r, g, b, a];
}

function hslToRgba(h, s, l) {
	var c = (1 - Math.abs(2 * l - 1)) * s;
	var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	var m = l - c / 2;
	var r, g, b;

	if (h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	return [r + m, g + m, b + m, 1.0];
}

function convertCoordinatesEventToGL(ev) {
	var x = ev.clientX;
	var y = ev.clientY;
	var rect = ev.target.getBoundingClientRect();

	x = (x - rect.left - rect.width / 2) / (rect.width / 2);
	y = (rect.height / 2 - (y - rect.top)) / (rect.height / 2);

	return [x, y];
}

function renderAllShapes() {
	var startTime = performance.now();

	gl.clear(gl.COLOR_BUFFER_BIT);

	for (var i = 0; i < g_shapesList.length; i++) {
		g_shapesList[i].render();
	}

	var duration = performance.now() - startTime;
	var perfDisplay = document.getElementById("performanceDisplay");

	perfDisplay.innerText =
		"Shapes: " +
		g_shapesList.length +
		" | Render: " +
		Math.floor(duration) +
		" ms";
}

function updateColorDisplay() {
	document.getElementById("redVal").innerText = parseFloat(
		document.getElementById("redSlider").value,
	).toFixed(2);
	document.getElementById("greenVal").innerText = parseFloat(
		document.getElementById("greenSlider").value,
	).toFixed(2);
	document.getElementById("blueVal").innerText = parseFloat(
		document.getElementById("blueSlider").value,
	).toFixed(2);
	document.getElementById("alphaVal").innerText = parseFloat(
		document.getElementById("alphaSlider").value,
	).toFixed(2);
}

function setShapeType(type) {
	g_selectedType = type;

	document.getElementById("btnPoint").className =
		type === "point" ? "active" : "";
	document.getElementById("btnTriangle").className =
		type === "triangle" ? "active" : "";
	document.getElementById("btnCircle").className =
		type === "circle" ? "active" : "";
}

function clearCanvas() {
	g_shapesList = [];

	renderAllShapes();
}

function undoShape() {
	if (g_shapesList.length > 0) {
		g_shapesList.pop();

		renderAllShapes();
	}
}

function toggleRainbow() {
	g_rainbowMode = !g_rainbowMode;
	document.getElementById("btnRainbow").className = g_rainbowMode
		? "active"
		: "";
}

function toggleSpray() {
	g_sprayMode = !g_sprayMode;
	document.getElementById("btnSpray").className = g_sprayMode ? "active" : "";
}

function drawPicture() {
	var orange = [1.0, 0.6, 0.2, 1.0];
	var darkOrange = [0.9, 0.5, 0.1, 1.0];
	var white = [1.0, 1.0, 1.0, 1.0];
	var black = [0.0, 0.0, 0.0, 1.0];
	var pink = [1.0, 0.6, 0.7, 1.0];
	var dkPink = [0.9, 0.4, 0.5, 1.0];

	// Head
	var head = new Circle();
	head.position = [0.0, 0.1];
	head.color = orange;
	head.size = 80;
	head.segments = 10;

	g_shapesList.push(head);

	// Left ear
	drawColoredTriangle([-0.3, 0.35, -0.45, 0.75, -0.05, 0.45], orange);
	drawColoredTriangle([-0.25, 0.4, -0.4, 0.7, -0.1, 0.45], pink);

	// Right ear
	drawColoredTriangle([0.3, 0.35, 0.45, 0.75, 0.05, 0.45], orange);
	drawColoredTriangle([0.25, 0.4, 0.4, 0.7, 0.1, 0.45], pink);

	// Left eye
	drawColoredTriangle([-0.2, 0.25, -0.15, 0.25, -0.15, 0.15], white);
	drawColoredTriangle([-0.2, 0.25, -0.2, 0.15, -0.15, 0.15], white);
	drawColoredTriangle([-0.15, 0.25, -0.1, 0.25, -0.1, 0.15], black);
	drawColoredTriangle([-0.15, 0.25, -0.15, 0.15, -0.1, 0.15], black);

	// Right eye
	drawColoredTriangle([0.1, 0.25, 0.15, 0.25, 0.15, 0.15], white);
	drawColoredTriangle([0.1, 0.25, 0.1, 0.15, 0.15, 0.15], white);
	drawColoredTriangle([0.15, 0.25, 0.2, 0.25, 0.2, 0.15], black);
	drawColoredTriangle([0.15, 0.25, 0.15, 0.15, 0.2, 0.15], black);

	// Nose
	drawColoredTriangle([-0.05, 0.1, 0.05, 0.1, 0.0, 0.05], dkPink);

	// Mouth
	drawColoredTriangle([0.0, 0.05, -0.05, 0.0, 0.0, 0.0], darkOrange);
	drawColoredTriangle([0.0, 0.05, 0.05, 0.0, 0.0, 0.0], darkOrange);

	// Left whiskers
	drawColoredTriangle([-0.12, 0.06, -0.55, 0.12, -0.55, 0.1], black);
	drawColoredTriangle([-0.12, 0.04, -0.55, 0.04, -0.55, 0.02], black);
	drawColoredTriangle([-0.12, 0.02, -0.55, -0.04, -0.55, -0.06], black);

	// Right whiskers
	drawColoredTriangle([0.12, 0.06, 0.55, 0.12, 0.55, 0.1], black);
	drawColoredTriangle([0.12, 0.04, 0.55, 0.04, 0.55, 0.02], black);
	drawColoredTriangle([0.12, 0.02, 0.55, -0.04, 0.55, -0.06], black);

	renderAllShapes();
}

function drawColoredTriangle(vertices, color) {
	var t = new Triangle();
	t.position = [0, 0];
	t.color = color;
	t.size = 0;
	t.render = function () {
		gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
		drawTriangle(vertices);
	};

	g_shapesList.push(t);
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
