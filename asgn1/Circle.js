class Circle {
	constructor() {
		this.type = "circle";
		this.position = [0.0, 0.0];
		this.color = [1.0, 1.0, 1.0, 1.0];
		this.size = 10.0;
		this.segments = 12;
	}

	render() {
		var xy = this.position;
		var rgba = this.color;
		var size = this.size;

		gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

		var d = size / 200.0;
		var angleStep = 360 / this.segments;

		for (var angle = 0; angle < 360; angle += angleStep) {
			var angle1 = (angle * Math.PI) / 180;
			var angle2 = ((angle + angleStep) * Math.PI) / 180;

			var vec1 = [Math.cos(angle1) * d, Math.sin(angle1) * d];
			var vec2 = [Math.cos(angle2) * d, Math.sin(angle2) * d];

			drawTriangle([
				xy[0],
				xy[1],
				xy[0] + vec1[0],
				xy[1] + vec1[1],
				xy[0] + vec2[0],
				xy[1] + vec2[1],
			]);
		}
	}
}
