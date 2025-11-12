// Captura da webcam
let video;

// Handpose
let handpose;
let hands = [];

// Lógica TCT
let painting;
let px = 0;
let py = 0;

// Crítico
const PINCH_THRESHOLD = 45;

// Feedback
let pinchDist = 0;
let agentState = "IDLE";

// Tela de Pintura
let sketchClassifier;
let classificationResult = "Desenhe algo e clique em 'Classificar'";

// --- NOVO: Variáveis de escala e offset ---
let scaleFactor, offsetX, offsetY;

function setup() {
    createCanvas(windowWidth, windowHeight);
    px = 0;
    py = 0;

    // Tela de pintura
    painting = createGraphics(1280, 960);
    painting.clear();

    // Webcam
    video = createCapture({ video: true, audio: false });
    video.size(1280, 960);
    video.hide();

    // Handpose
    handpose = ml5.handpose(video, { flipHorizontal: false }, handposeModelReady);
    handpose.on("predict", gotHands);

    // DoodleNet
    sketchClassifier = ml5.imageClassifier('DoodleNet', classifierModelReady);

    // Botões
    const clearBtn = select('#clearButton');
    if (clearBtn) clearBtn.mousePressed(clearDrawing);

    const classifyBtn = select('#btnClassify');
    if (classifyBtn) classifyBtn.mousePressed(classifyDrawing);
}

function handposeModelReady() {
    console.log("Modelo Handpose Carregado!");
}

function classifierModelReady() {
    console.log("Modelo DoodleNet Carregado!");
}

function gotHands(results) {
    hands = results;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(220);

    // === 1. CALCULA ESCALA E OFFSET DO VÍDEO NA TELA ===
    let videoW = video.width;
    let videoH = video.height;
    let displayW = width;
    let displayH = height;

    scaleFactor = Math.min(displayW / videoW, displayH / videoH);
    let scaledW = videoW * scaleFactor;
    let scaledH = videoH * scaleFactor;
    offsetX = (displayW - scaledW) / 2;
    offsetY = (displayH - scaledH) / 2;

    // === 2. DESENHA O VÍDEO (centralizado, com letterbox) ===
    push();
    imageMode(CORNER);
    image(video, offsetX, offsetY, scaledW, scaledH);
    pop();

    // === 3. LÓGICA DE DETECÇÃO E DESENHO ===
    if (hands.length > 0) {
        let hand = hands[0];
        let index = hand.landmarks[8];  // Ponta do indicador
        let thumb = hand.landmarks[4];  // Ponta do polegar

        // Mapeia com escala e offset
        let idx = mapHandPoint(index[0], index[1]);
        let thb = mapHandPoint(thumb[0], thumb[1]);

        let indexX = idx.x;
        let indexY = idx.y;
        let thumbX = thb.x;
        let thumbY = thb.y;

        let x = (indexX + thumbX) / 2;
        let y = (indexY + thumbY) / 2;

        pinchDist = dist(indexX, indexY, thumbX, thumbY);

        if (pinchDist < PINCH_THRESHOLD) {
            agentState = "GRABBING";
            drawBrush(x, y, px, py);
        } else {
            agentState = "TRACKING";
        }

        px = x;
        py = y;
    } else {
        px = 0;
        py = 0;
        agentState = "IDLE";
    }

    // === 4. DESENHA A PINTURA POR CIMA ===
    image(painting, 0, 0, width, height);

    // === 5. DESENHA OS KEYPOINTS ===
    drawKeypoints();

    // === 6. UI DE STATUS ===
    fill(0);
    noStroke();
    textSize(18);
    text("Estado: " + agentState, 20, 40);
    text("Distância: " + (hands.length > 0 ? pinchDist.toFixed(1) : "N/A"), 20, 70);
    text("Limiar: " + PINCH_THRESHOLD, 20, 100);

    // Resultado da classificação
    fill(255, 0, 0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text(classificationResult, width / 2, 40);
    textAlign(LEFT);
}

// === FUNÇÃO AUXILIAR: MAPEIA PONTO DA MÃO COM ESCALA E OFFSET ===
function mapHandPoint(x_raw, y_raw) {
    let x = x_raw * scaleFactor + offsetX;
    let y = y_raw * scaleFactor + offsetY;
    return { x, y };
}

// === DESENHA OS 21 PONTOS DA MÃO ===
function drawKeypoints() {
    for (let i = 0; i < hands.length; i++) {
        const hand = hands[i];
        for (let j = 0; j < hand.landmarks.length; j++) {
            const kp = hand.landmarks[j];
            const p = mapHandPoint(kp[0], kp[1]);

            fill(0, 255, 0);
            noStroke();
            ellipse(p.x, p.y, 12, 12);
        }
    }
}

// === DESENHA A LINHA DO PINCEL ===
function drawBrush(x, y, px, py) {
    if (px === 0 && py === 0) return;

    painting.stroke(0);
    painting.strokeWeight(10);
    painting.line(x, y, px, py);
}

// === LIMPA O DESENHO ===
function clearDrawing() {
    painting.clear();
    classificationResult = "Desenhe algo e clique em 'Classificar'";
    console.log("Desenho limpo!");
}

// === CLASSIFICA O DESENHO ===
function classifyDrawing() {
    if (painting.width === 0) return;

    classificationResult = "Analisando...";

    const tempGfx = createGraphics(256, 256);
    tempGfx.background(255);
    tempGfx.image(painting, 0, 0, 256, 256);
    sketchClassifier.classify(tempGfx, gotResults);
    tempGfx.remove();
}

function gotResults(error, results) {
    if (error) {
        console.error(error);
        classificationResult = "Erro ao classificar.";
        return;
    }

    let label = results[0].label;
    let confidence = (results[0].confidence * 100).toFixed(1);
    classificationResult = `${label} (${confidence}%)`;
}