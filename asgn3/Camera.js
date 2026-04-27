class Camera {
	constructor(canvas) {
		this.fov = 60;

		this.eye = new Vector3([16, 1.6, 24]);
		this.at  = new Vector3([16, 1.6, 16]);
		this.up  = new Vector3([0, 1, 0]);

		this.viewMatrix       = new Matrix4();
		this.projectionMatrix = new Matrix4();

		this.aspect = canvas.width / canvas.height;
		this.updateProjection();
		this.updateView();

		this._tmp = new Vector3();
	}

	updateView() {
		this.viewMatrix.setLookAt(
			this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
			this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
			this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
		);
	}

	updateProjection() {
		this.projectionMatrix.setPerspective(this.fov, this.aspect, 0.1, 5000);
	}

	resize(canvas) {
		this.aspect = canvas.width / canvas.height;
		this.updateProjection();
	}

	forwardVec() {
		const f = this._tmp;
		f.set(this.at);
		f.sub(this.eye);
		f.normalize();
		return f;
	}

	moveForward(speed) {
		const f = this.forwardVec();
		f.mul(speed);

		this.eye.add(f);
		this.at.add(f);

		this.updateView();
	}

	moveBackwards(speed) {
		this.moveForward(-speed);
	}

	moveLeft(speed) {
		const f = this.forwardVec();
		const s = Vector3.cross(this.up, f);
		s.normalize();
		s.mul(speed);

		this.eye.add(s);
		this.at.add(s);

		this.updateView();
	}

	moveRight(speed) {
		const f = this.forwardVec();
		const s = Vector3.cross(f, this.up);
		s.normalize();
		s.mul(speed);

		this.eye.add(s);
		this.at.add(s);

		this.updateView();
	}

	moveUp(speed) {
		const u = new Vector3(this.up.elements);
		u.normalize();
		u.mul(speed);

		this.eye.add(u);
		this.at.add(u);

		this.updateView();
	}

	moveDown(speed) {
		this.moveUp(-speed);
	}

	panLeft(alpha) {
		const f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);

		const r = new Matrix4();
		r.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
		const fp = r.multiplyVector3(f);

		this.at.set(this.eye);
		this.at.add(fp);

		this.updateView();
	}

	panRight(alpha) {
		this.panLeft(-alpha);
	}

	panUp(alpha) {
		const f = new Vector3();
		f.set(this.at);
		f.sub(this.eye);

		const fNorm = new Vector3(f.elements);
		fNorm.normalize();

		const cosPitch = fNorm.elements[0] * this.up.elements[0]
			+ fNorm.elements[1] * this.up.elements[1]
			+ fNorm.elements[2] * this.up.elements[2];

		const pitch = Math.asin(Math.max(-1, Math.min(1, cosPitch))) * 180 / Math.PI;
		const limit = 89;

		let applied = alpha;
		if (pitch + applied > limit)  applied = limit - pitch;
		if (pitch + applied < -limit) applied = -limit - pitch;

		const side = Vector3.cross(fNorm, this.up);
		side.normalize();

		const r = new Matrix4();
		r.setRotate(applied, side.elements[0], side.elements[1], side.elements[2]);
		const fp = r.multiplyVector3(f);

		this.at.set(this.eye);
		this.at.add(fp);

		this.updateView();
	}

	panDown(alpha) {
		this.panUp(-alpha);
	}
}
