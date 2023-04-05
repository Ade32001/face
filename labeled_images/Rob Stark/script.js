const imageUpload = document.getElementById('imageUpload');
const videoUpload = document.getElementById('videoUpload');
const imageElement = document.getElementById('image');
const videoElement = document.getElementById('video');
const canvas = document.getElementById('canvas');


Promise.all([
  faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(start);

async function start() {
  const container = document.createElement('div');
  container.style.position = 'relative';
  document.body.append(container);
  const labeledFaceDescriptors = await loadLabeledImages();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
  let displaySize;

  document.body.append('Loaded');

  imageUpload.addEventListener('change', async () => {
    if (imageUpload.files[0]) {
      const mimeType = imageUpload.files[0].type;
      if (mimeType.startsWith('image/')) {
        processFile(imageUpload.files[0], 'image');
      } else {
        console.error('Please upload a valid image file');
      }
    }
  });

  videoUpload.addEventListener('change', async () => {
    if (videoUpload.files[0]) {
      const mimeType = videoUpload.files[0].type;
      if (mimeType.startsWith('video/')) {
        processFile(videoUpload.files[0], 'video');
      } else {
        console.error('Please upload a valid video file');
      }
    }
  });

  function processFile(file, type) {
    if (type === 'image') {
      // Process the uploaded image
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        const img = new Image();
        img.src = fileReader.result;
        img.onload = async function () {
          imageElement.src = img.src;
          imageElement.style.display = 'block';
          videoElement.style.display = 'none';
          canvas.width = img.width;
          canvas.height = img.height;

          displaySize = { width: img.width, height: img.height };
          faceapi.matchDimensions(canvas, displaySize);

          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

          results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box;
            const drawOptions = {
              label: result.toString(),
              boxColor: 'blue',
              lineWidth: 2,
              drawLabelOptions: {
                anchorPosition: 'BOTTOM_LEFT',
                padding: 6,
                fontSize: 16,
                fontStyle: 'Arial',
                fontColor: 'white',
                fontBackgroundColor: 'rgba(0, 0, 0, 0.5)'
              }
            };
            const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
            drawBox.draw(canvas);
          });
        };
      };
      fileReader.readAsDataURL(file);
    } else if (type === 'video') {
      const videoURL = URL.createObjectURL(file);
      videoElement.src = videoURL;
      videoElement.style.display = 'block';
      imageElement.style.display = 'none';


      video.onloadedmetadata = () => {
        displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);
      };

      video.addEventListener('play', () => {
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        displaySize = { width: video.offsetWidth, height: video.offsetHeight };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
          const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
            drawBox.draw(canvas);
          });
        }, 100);
      });
    }
  }
}

async function loadLabeledImages() {
  const labels = ['Black Widow', 'Captain America', 'Captain Marvel', 'Hawkeye', 'Jim Rhodes', 'Thor', 'Tony Stark', 'Adelin Deaconu', 'Ned Stark', 'Jon Snow', 'Rob Stark'];
  return Promise.all(
    labels.map(async label => {
      const descriptions = [];
      for (let i = 1; i <= 2; i++) {
        const img = await faceapi.fetchImage(`https://raw.githubusercontent.com/Ade32001/face/main/labeled_images/${label}/${i}.jpg`);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

