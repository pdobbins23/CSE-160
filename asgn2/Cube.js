class Cube {
	static positionBuffer = null;
	static shadeBuffer = null;
	static vertexCount = 0;

	static buildBuffers(gl) {
		if (Cube.positionBuffer) return;

		const positions = [];
		const shades = [];

		const pushFace = (a, b, c, d, shade) => {
			positions.push(...a, ...b, ...c, ...a, ...c, ...d);
			for (let i = 0; i < 6; i++) shades.push(shade);
		};

		pushFace([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], 1.0);
		pushFace([1, 0, 1], [0, 0, 1], [0, 1, 1], [1, 1, 1], 0.55);
		pushFace([0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1], 0.95);
		pushFace([0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0], 0.5);
		pushFace([1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0], 0.8);
		pushFace([0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1], 0.7);

		Cube.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cube.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		Cube.shadeBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cube.shadeBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shades), gl.STATIC_DRAW);

		Cube.vertexCount = positions.length / 3;
	}
}

function drawCube(matrix, color) {
	Cube.buildBuffers(gl);

	gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
	gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cube.positionBuffer);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Position);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cube.shadeBuffer);
	gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Shade);

	gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
}
