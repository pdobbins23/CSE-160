class Cylinder {
	static positionBuffer = null;
	static shadeBuffer = null;
	static vertexCount = 0;
	static segments = 16;

	static buildBuffers(gl) {
		if (Cylinder.positionBuffer) return;

		const positions = [];
		const shades = [];
		const N = Cylinder.segments;
		const r = 0.5;

		for (let i = 0; i < N; i++) {
			const a0 = (i / N) * Math.PI * 2;
			const a1 = ((i + 1) / N) * Math.PI * 2;
			const x0 = Math.cos(a0) * r;
			const z0 = Math.sin(a0) * r;
			const x1 = Math.cos(a1) * r;
			const z1 = Math.sin(a1) * r;

			positions.push(x0, 0, z0, x1, 0, z1, x1, 1, z1);
			positions.push(x0, 0, z0, x1, 1, z1, x0, 1, z0);
			const sideShade = 0.7 + 0.25 * Math.abs(Math.cos(a0));
			for (let k = 0; k < 6; k++) shades.push(sideShade);

			positions.push(0, 1, 0, x0, 1, z0, x1, 1, z1);
			for (let k = 0; k < 3; k++) shades.push(0.95);

			positions.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
			for (let k = 0; k < 3; k++) shades.push(0.55);
		}

		Cylinder.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		Cylinder.shadeBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.shadeBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shades), gl.STATIC_DRAW);

		Cylinder.vertexCount = positions.length / 3;
	}
}

function drawCylinder(matrix, color) {
	Cylinder.buildBuffers(gl);

	gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
	gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.positionBuffer);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Position);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.shadeBuffer);
	gl.vertexAttribPointer(a_Shade, 1, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(a_Shade);

	gl.drawArrays(gl.TRIANGLES, 0, Cylinder.vertexCount);
}
