let canvas;
let ctx;

function main() {
	canvas = document.getElementById("example");

	if (!canvas) {
		console.log("Failed to retrieve the <canvas> element");
		return false;
	}

	ctx = canvas.getContext("2d");

	clearCanvas();

	const v1 = getVectorFromInputs("v1");

	drawVector(v1, "red");

	return true;
}

function clearCanvas() {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
	const originX = canvas.width / 2;
	const originY = canvas.height / 2;

	ctx.beginPath();
	ctx.moveTo(originX, originY);
	ctx.lineTo(originX + v.elements[0] * 20, originY - v.elements[1] * 20);
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.stroke();
}

function getVectorFromInputs(prefix) {
	const x = parseFloat(document.getElementById(prefix + "x").value) || 0;
	const y = parseFloat(document.getElementById(prefix + "y").value) || 0;

	return new Vector3([x, y, 0]);
}

function handleDrawEvent() {
	clearCanvas();

	const v1 = getVectorFromInputs("v1");
	const v2 = getVectorFromInputs("v2");

	drawVector(v1, "red");
	drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
	clearCanvas();

	const v1 = getVectorFromInputs("v1");
	const v2 = getVectorFromInputs("v2");

	const operation = document
		.getElementById("operation")
		.value.toLowerCase()
		.trim();
	const scalar = parseFloat(document.getElementById("scalar").value) || 0;

	drawVector(v1, "red");
	drawVector(v2, "blue");

	if (operation === "add") {
		const v3 = new Vector3(v1.elements);

		v3.add(v2);

		drawVector(v3, "green");
	} else if (operation === "sub") {
		const v3 = new Vector3(v1.elements);

		v3.sub(v2);

		drawVector(v3, "green");
	} else if (operation === "mul") {
		const v3 = new Vector3(v1.elements);
		const v4 = new Vector3(v2.elements);

		v3.mul(scalar);
		v4.mul(scalar);

		drawVector(v3, "green");
		drawVector(v4, "green");
	} else if (operation === "div") {
		if (scalar === 0) {
			console.log("Cannot divide by zero.");
			return;
		}

		const v3 = new Vector3(v1.elements);
		const v4 = new Vector3(v2.elements);

		v3.div(scalar);
		v4.div(scalar);

		drawVector(v3, "green");
		drawVector(v4, "green");
	} else if (operation === "magnitude") {
		console.log("Magnitude v1:", v1.magnitude());
		console.log("Magnitude v2:", v2.magnitude());
	} else if (operation === "normalize") {
		const v3 = new Vector3(v1.elements);
		const v4 = new Vector3(v2.elements);

		v3.normalize();
		v4.normalize();

		drawVector(v3, "green");
		drawVector(v4, "green");
	} else if (operation === "angle between" || operation === "angle") {
		console.log("Angle between v1 and v2:", angleBetween(v1, v2), "degrees");
	} else if (operation === "area") {
		console.log("Area of the triangle:", areaTriangle(v1, v2));
	}
}

function angleBetween(v1, v2) {
	const denominator = v1.magnitude() * v2.magnitude();

	if (denominator === 0) {
		console.log(
			"Angle between is undefined when either vector has magnitude 0.",
		);
		return 0;
	}

	const cosine = Vector3.dot(v1, v2) / denominator;
	const clampedCosine = Math.max(-1, Math.min(1, cosine));

	return (Math.acos(clampedCosine) * 180) / Math.PI;
}

function areaTriangle(v1, v2) {
	return Vector3.cross(v1, v2).magnitude() / 2;
}
