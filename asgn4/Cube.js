class Cube {
	static positionBuffer = null;
	static normalBuffer = null;
	static uvBuffer = null;
	static vertexCount = 0;

	static buildBuffers(gl) {
		if (Cube.positionBuffer) return;

		const positions = [];
		const normals = [];
		const uvs = [];

		const pushFace = (a, b, c, d, n) => {
			positions.push(...a, ...b, ...c, ...a, ...c, ...d);
			for (let i = 0; i < 6; i++) normals.push(...n);
			uvs.push(0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1);
		};

		pushFace([0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [ 0,  0,  1]);
		pushFace([1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0], [ 0,  0, -1]);
		pushFace([0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0], [ 0,  1,  0]);
		pushFace([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [ 0, -1,  0]);
		pushFace([1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1], [ 1,  0,  0]);
		pushFace([0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0], [-1,  0,  0]);

		Cube.positionBuffer = makeStaticBuffer(positions);
		Cube.normalBuffer   = makeStaticBuffer(normals);
		Cube.uvBuffer       = makeStaticBuffer(uvs);
		Cube.vertexCount    = positions.length / 3;
	}
}


function drawCube(matrix, baseColor, texColorWeight, texIndex) {
	Cube.buildBuffers(gl);

	gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
	setNormalMatrix(matrix);
	gl.uniform4fv(mesh.u_BaseColor, baseColor);
	gl.uniform1f(mesh.u_TexColorWeight, texColorWeight);
	gl.uniform1i(mesh.u_TexIndex, texIndex);

	bindAttrib(Cube.positionBuffer, mesh.a_Position, 3);
	bindAttrib(Cube.normalBuffer,   mesh.a_Normal,   3);
	bindAttrib(Cube.uvBuffer,       mesh.a_UV,       2);

	gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
}


function makeStaticBuffer(data) {
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	return buf;
}
