# Whole-way tread pilot

Frozen before fitting on f0de61a3: Williams 1450813223/225 and the neighbouring ground 1450813220 at z=−1300. The holdout is 9235148 at z=−300. Its axis and lane count are catalogued. The south Connector survey already contains exit248c stripe picks for it. Exclude those picks, edited terrain and rendered heights from the solve. This is a blind interior split on a catalogued alignment.

A source run has a directed provider ID, original vertex sequence, station in metres, mode, and separate provenance for width, elevation, and connectivity. Represent crossing order independently of routing. Solve on full geometry before any tile owns a fragment. Generate each tread triangle once; cut its 3D vertices and station attributes at tile boundaries. Render probes raycast the emitted geometry; wheels use City's triangleHeight on the owning surface.

Architecture review, November 24: independent axis clips lose skew corners. Clip faces, retain source station and constrain connected approach endpoints before splitting. Product review: source sidewalks can have connected endpoints without measured widths; report the path and leave its physical edges unknown. A posted vehicle restriction is a separate field from modeled and surveyed soffit clearance.
