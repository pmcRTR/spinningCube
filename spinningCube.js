/** JavaScript on <canvas> wireframe / hidden line / light sourced filled 3d cube. pmc
  */

//IIFE called from the associated HTML, see the <script> tag
(function spinningCube() {

  // objects
  class Point3d {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  class Point2d {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  class Face {
    constructor(points2d, isVisible, shade) {
      this.points2d = points2d;
      this.isVisible = isVisible;
      this.shade = shade;
    }
  }

  const canvas = document.getElementById("cubeCanvas");
  const context = canvas.getContext("2d");

  // try setting the style of the cube as required:
  // 'line' means a wireframe cube will be generated.
  // 'hidden' means a hidden line cube will be generated.
  // 'filled' means a light sourced filled cube will be generated.
  const cubeStyle = 'filled';

  // 0 to 359.75 (because 360 == 0) degrees in 0.25 degree steps
  const angles = [];

  let sinXIndex = 0;
  let sinYIndex = 0;
  let sinZIndex = 0;
  // cos and sin can both be derived from the sin table as cos is just sin + 90 degrees
  let cosXIndex = sinXIndex + 360;
  let cosYIndex = sinYIndex + 360;
  let cosZIndex = sinZIndex + 360;
  let sinX = 0;
  let sinY = 0;
  let sinZ = 0;
  let cosX = 0;
  let cosY = 0;
  let cosZ = 0;

  const rotationMatrix = [];

  // cube points are like this:
  //     6-------7
  //    /|      /|
  //   / |     / |
  //  2--|----3  |
  //  |  4----|--5
  //  | /     | /
  //  |/      |/
  //  0-------1
  //

  // 3d screen coordinates are like this:
  // with point 0,0,0 being the dead centre of the screen
  //
  //           y   z
  //           |  /
  //           | /
  //           |/
  //  ---------0--------- x
  //          /|
  //         / |
  //        /  |
         
  const point3d_0 = new Point3d(-100, -100, -100);
  const point3d_1 = new Point3d(100, -100, -100);
  const point3d_2 = new Point3d(-100, 100, -100);
  const point3d_3 = new Point3d(100, 100, -100);
  const point3d_4 = new Point3d(-100, -100, 100);
  const point3d_5 = new Point3d(100, -100, 100);
  const point3d_6 = new Point3d(-100, 100, 100);
  const point3d_7 = new Point3d(100, 100, 100);

  // Surface Normal Unit Vectors (SNUVs) describe the direction their associated face is pointing and are used for face visibilility calculations
  // A vector that is normal to a surface is perpendicular to that surface and has a unit length ie. a length of 1
  // Each surface of the cube has such a vector.  Drawn, a surface facing right that has a corresponding SNUV
  // (represented by the two hyphens) would look like this:
  //
  // |
  // |
  // |--
  // |
  // |
  //
  // The two hyphens are pointing to the right indicating the face is also pointing to the right.
  // As long as the SNUV for a surface is rotated through X, Y and Z by the same degrees as it's associated face it still indicates the direction of that face
  // In a convex shape (such as a cube) any face calculated from its SNUV as pointing away from the viewpoint is invisible as it is covered by
  // other faces of the shape itself.  A surface that is not visible does not need to be drawn or filled.
  // 

  const snuv0 = new Point3d(0, 0, -1);
  const snuv1 = new Point3d(1, 0, 0);
  const snuv2 = new Point3d(0, 0, 1);
  const snuv3 = new Point3d(-1, 0, 0);
  const snuv4 = new Point3d(0, -1, 0);
  const snuv5 = new Point3d(0, 1, 0);

  const point2d_0 = new Point2d(0, 0);
  const point2d_1 = new Point2d(0, 0);
  const point2d_2 = new Point2d(0, 0);
  const point2d_3 = new Point2d(0, 0);
  const point2d_4 = new Point2d(0, 0);
  const point2d_5 = new Point2d(0, 0);
  const point2d_6 = new Point2d(0, 0);
  const point2d_7 = new Point2d(0, 0);

  // faces are described from the bottom left corner point of each face proceeding anticlockwise for the remaining points
  // this is required for the SNUV calculations to be correct for determining visibility of each face

  const face0 = new Face([point2d_0, point2d_1, point2d_3, point2d_2], true, 0);
  const face1 = new Face([point2d_1, point2d_5, point2d_7, point2d_3], true, 0);
  const face2 = new Face([point2d_5, point2d_4, point2d_6, point2d_7], true, 0);
  const face3 = new Face([point2d_4, point2d_0, point2d_2, point2d_6], true, 0);
  const face4 = new Face([point2d_4, point2d_5, point2d_1, point2d_0], true, 0);
  const face5 = new Face([point2d_2, point2d_3, point2d_7, point2d_6], true, 0);

  // cube faces are like this:
  // front = face 0
  // back = face 2
  // right = face 1
  // left = face 3
  // bottom = face 4
  // top = face 5

  const faces = [face0, face1, face2, face3, face4, face5];

  const DISTANCE = 512;
  const VIEWPOINT = -DISTANCE;

  // set these numbers to change the colour of the cube
  const shades = [];
  const firstShade = "#000000";
  const lastShade = "#F89880";
  const shadesRequired = 64;
  // background colour can be changed here or in the stylesheet
  // document.body.style.backgroundColor = "#659EC7";

  // functions
  function createAngleTab() {
    let angle = -0.25;
    const anglesLength = 360 * 4;
    // create a sin / cos array from angles of 0 to 360 degrees in radians (math functions want radians) in 0.25 degree steps
    for (let i = 0; i < anglesLength; i++) {
      angles[i] = Math.sin(degreesToRadians(angle += 0.25));
    }
  }

  function generateShades(startShade, endShade, numberOfShades) {
    const startShadeStripped = startShade.substr(1);
    const endShadeStripped = endShade.substr(1);
    const startRedByte = parseInt(startShadeStripped.substr(0,2), 16);
    const startGreenByte = parseInt(startShadeStripped.substr(2,2), 16);
    const startBlueByte = parseInt(startShadeStripped.substr(4,2), 16);
    const endRedByte = parseInt(endShadeStripped.substr(0,2), 16);
    const endGreenByte = parseInt(endShadeStripped.substr(2,2), 16);
    const endBlueByte = parseInt(endShadeStripped.substr(4,2), 16);
    const redInc = (endRedByte - startRedByte) / numberOfShades;
    const greenInc = (endGreenByte - startGreenByte) / numberOfShades;
    const blueInc = (endBlueByte - startBlueByte) / numberOfShades;
    shades[0] = startShade;
    let redShade = startRedByte;
    let greenShade = startGreenByte;
    let blueShade = startBlueByte;
    for (let i = 1; i < numberOfShades; i++) {
      redShade += redInc;
      greenShade += greenInc;
      blueShade += blueInc;
      let redShadeRounded = Math.round(redShade);
      let greenShadeRounded = Math.round(greenShade);
      let blueShadeRounded = Math.round(blueShade);
      if (redShadeRounded > endRedByte) {
        redShadeRounded = endRedByte;
      }
      if (greenShadeRounded > endGreenByte) {
        greenShadeRounded = endGreenByte;
      }
      if (blueShadeRounded > endBlueByte) {
        blueShadeRounded = endBlueByte;
      }
      shades[i] = "#".concat(redShadeRounded.toString(16).padStart(2, "0")).concat(greenShadeRounded.toString(16).padStart(2, "0")).concat(blueShadeRounded.toString(16).padStart(2, "0"));
    }
  }

  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  // instead of creating new points objects the existing ones are reused
  // resetting the coordinates to their initial values each iteration before rotating them prevents cumulative rounding errors
  function resetPoints() {
    point3d_0.x = -100; point3d_0.y = -100; point3d_0.z = -100;
    point3d_1.x = 100; point3d_1.y = -100; point3d_1.z = -100;
    point3d_2.x = -100; point3d_2.y = 100; point3d_2.z = -100;
    point3d_3.x = 100; point3d_3.y = 100; point3d_3.z = -100;
    point3d_4.x = -100; point3d_4.y = -100; point3d_4.z = 100;
    point3d_5.x = 100; point3d_5.y = -100; point3d_5.z = 100;
    point3d_6.x = -100; point3d_6.y = 100; point3d_6.z = 100;
    point3d_7.x = 100; point3d_7.y = 100; point3d_7.z = 100;
    snuv0.x = 0; snuv0.y = 0; snuv0.z = -1;
    snuv1.x = 1; snuv1.y = 0; snuv1.z = 0;
    snuv2.x = 0; snuv2.y = 0; snuv2.z = 1;
    snuv3.x = -1; snuv3.y = 0; snuv3.z = 0;
    snuv4.x = 0; snuv4.y = -1; snuv4.z = 0;
    snuv5.x = 0; snuv5.y = 1; snuv5.z = 0;
  }

  function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  function getAngles(xStep, yStep, zStep) {
    sinXIndex += xStep;
    cosXIndex += xStep;
    if (sinXIndex > angles.length - 1) {
      sinXIndex = 0 + (sinXIndex - angles.length);
    }
    if (cosXIndex > angles.length - 1) {
      cosXIndex = 0 + (cosXIndex - angles.length);
    }

    sinYIndex += yStep;
    cosYIndex += yStep;
    if (sinYIndex > angles.length - 1) {
      sinYIndex = 0 + (sinYIndex - angles.length);
    }
    if (cosYIndex > angles.length - 1) {
      cosYIndex = 0 + (cosYIndex - angles.length);
    }

    sinZIndex += zStep;
    cosZIndex += zStep;
    if (sinZIndex > angles.length - 1) {
      sinZIndex = 0 + (sinZIndex - angles.length);
    }
    if (cosZIndex > angles.length - 1) {
      cosZIndex = 0 + (cosZIndex - angles.length);
    }

    sinX = angles[sinXIndex];
    sinY = angles[sinYIndex];
    sinZ = angles[sinZIndex];
    cosX = angles[cosXIndex];
    cosY = angles[cosYIndex];
    cosZ = angles[cosZIndex];
  }

  function buildRotationMatrix() {
    rotationMatrix[0] = cosY * cosZ;
    rotationMatrix[1] = cosY * sinZ;
    rotationMatrix[2] = -sinY;
    rotationMatrix[3] = (sinX * sinY * cosZ) - (cosX * sinZ);
    rotationMatrix[4] = (sinX * sinY * sinZ) + (cosX * cosZ);
    rotationMatrix[5] = sinX * cosY;
    rotationMatrix[6] = (cosX * sinY * cosZ) + (sinX * sinZ);
    rotationMatrix[7] = (cosX * sinY * sinZ) - (sinX * cosZ);
    rotationMatrix[8] = cosX * cosY;
  }

  function rotatePoint(pointToRotate) {
    let x = pointToRotate.x * rotationMatrix[0];
    let y = pointToRotate.y * rotationMatrix[3];
    let z = pointToRotate.z * rotationMatrix[6];
    const rotatedX = x + y + z;
    x = pointToRotate.x * rotationMatrix[1];
    y = pointToRotate.y * rotationMatrix[4];
    z = pointToRotate.z * rotationMatrix[7];
    const rotatedY = x + y + z;
    x = pointToRotate.x * rotationMatrix[2];
    y = pointToRotate.y * rotationMatrix[5];
    z = pointToRotate.z * rotationMatrix[8];
    const rotatedZ = x + y + z;
    pointToRotate.x = rotatedX;
    pointToRotate.y = rotatedY;
    pointToRotate.z = rotatedZ;
  }

  function negatePoint(sourcePoint, destPoint) {
    destPoint.x = -sourcePoint.x;
    destPoint.y = -sourcePoint.y;
    destPoint.z = -sourcePoint.z;
  }

  // some points are rotated while others are just mirrored
  // as a cube is symmetrical it is possible to only rotate the four points of the front face and then just negate them (ie. mirror them)
  // to obtain the rotated coordinates of the four points of the rear face. The same is true for the SNUVs.
  function rotateAllPoints() {
    rotatePoint(point3d_0);
    rotatePoint(point3d_1);
    rotatePoint(point3d_2);
    rotatePoint(point3d_3);
    negatePoint(point3d_3, point3d_4);
    negatePoint(point3d_2, point3d_5);
    negatePoint(point3d_1, point3d_6);
    negatePoint(point3d_0, point3d_7);
    rotatePoint(snuv0);
    rotatePoint(snuv1);
    negatePoint(snuv0, snuv2);
    negatePoint(snuv1, snuv3);
    rotatePoint(snuv4);
    negatePoint(snuv4, snuv5);
  }

  // the cube is defined in three dimensions internally but needs to be drawn in two dimensions, the calculations below modify x and y by z
  // to get the correct distance perspective for each point of the cube when drawn in two dimensions so that it looks correct
  function transformPoint(pointToTransform, twoDeePoint) {
    twoDeePoint.x = (canvas.width / 2) + (Math.round((pointToTransform.x * DISTANCE) / (pointToTransform.z + DISTANCE)));
    twoDeePoint.y = (canvas.height / 2) - (Math.round((pointToTransform.y * DISTANCE) / (pointToTransform.z + DISTANCE)));
  }

  function transformAllPoints() {
    transformPoint(point3d_0, point2d_0);
    transformPoint(point3d_1, point2d_1);
    transformPoint(point3d_2, point2d_2);
    transformPoint(point3d_3, point2d_3);
    transformPoint(point3d_4, point2d_4);
    transformPoint(point3d_5, point2d_5);
    transformPoint(point3d_6, point2d_6);
    transformPoint(point3d_7, point2d_7);
  }

  // the calculation shown checks each face and its SNUV with the viewpoint to determine if that face is visible
  // as a bonus the "amount of visibiity" each face has can be used to pull a corresponding fill shade for that face from
  // an array of shades making the shading "lightsourced" ie. the more full to the viewpoint the face is, the brighter its fill shade
  function determineVisibility(face, facePoint, faceSnuv) {
    //override the visibility calc and set all faces to visible if the cubeStyle is 'line'
    if (cubeStyle === 'line') {
      face.isVisible = true;
    } else {
        face.shade = Math.round((faceSnuv.x) - (faceSnuv.y) - (faceSnuv.z) * (shades.length - 1));
        const visibilityCalc = (facePoint.x * faceSnuv.x) + (facePoint.y * faceSnuv.y) + ((facePoint.z - VIEWPOINT) * faceSnuv.z);
        if (visibilityCalc <= 0) {
          face.isVisible = true;
        } else {
          face.isVisible = false;
      }
    }
  }

  function setFaces() {
    determineVisibility(face0, point3d_0, snuv0);
    determineVisibility(face1, point3d_1, snuv1);
    determineVisibility(face2, point3d_5, snuv2);
    determineVisibility(face3, point3d_4, snuv3);
    determineVisibility(face4, point3d_4, snuv4);
    determineVisibility(face5, point3d_2, snuv5);
  }

  function drawFaces(facesToDraw) {
    for (let currentFace = 0; currentFace < facesToDraw.length; currentFace++) {
      const faceBeingDrawn = facesToDraw[currentFace];
      if (faceBeingDrawn.isVisible) {
        let point = faceBeingDrawn.points2d[0];
        context.beginPath();
        context.moveTo(point.x, point.y);
        for (let currentPoint = 1; currentPoint < faceBeingDrawn.points2d.length; currentPoint++) {
          point = faceBeingDrawn.points2d[currentPoint];
          context.lineTo(point.x, point.y);
        }
        context.closePath();

        if (cubeStyle === 'line' || cubeStyle === 'hidden') {
          // for a wireframe of hidden line cube, use lines only
          context.lineWidth = 1;
          context.strokeStyle = lastShade;
          context.stroke();
        } else {
          // for a filled cube, use filling only
          context.fillStyle = shades[faceBeingDrawn.shade];
          context.fill();
        }
      }
    }
  }

  // main routine loop
  var mainLoop = function() {
    clearCanvas();
    resetPoints();
    // try changing the x, y, z angle steps as required to get different rotation patterns
    getAngles(1, 5, 2);
    buildRotationMatrix();
    rotateAllPoints();
    transformAllPoints();
    setFaces();
    drawFaces(faces);
    // keep the cube moving
    requestAnimationFrame(mainLoop, canvas);
  };

  // build the angles table
  createAngleTab();
  // generate the cube colours gradient
  generateShades(firstShade, lastShade, shadesRequired);
  // start the cube moving
  requestAnimationFrame(mainLoop, canvas);
}());
