// Captura da webcam
let video;

// Handpose
let handpose;
let hands = []; // Armazena as detecções


// Lógica TCT
let painting;
let px = 0;
let py = 0;

// Crítico
const PINCH_THRESHOLD = 45;

// Feedback
let pinchDist = 0;
let agentState = "IDLE"; //// IDLE (Ocioso), TRACKING (Rastreando), GRABBING (Agarrando)

// Tela de Pintura
let sketchClassifier;
let classificationResult = "Desenhe algo e clique em 'Classificar'";

// --- Função de Setup do p5.js ---
function setup() {
// Trava o canvas no tamanho do TCT
    createCanvas(windowWidth, windowHeight);
    px = 0;
    py = 0;

    // Inicia a tela de pintura (lógica TCT)
    painting = createGraphics(1280, 960);
    painting.clear();
    
    // Configura a captura de vídeo (lógica TCT)
    video = createCapture({ video: true, audio: false });
    video.size(1280, 960);
    video.hide();

    // Inicia a detecção (lógica TCT)
    handpose = ml5.handpose(video, handposeModelReady);

    handpose.on("predict", gotHands);

    sketchClassifier = ml5.imageClassifier('DoodleNet', classifierModelReady);

    const clearBtn = select('#clearButton');
    clearBtn.mousePressed(clearDrawing);

    const classifyBtn = select('#btnClassify');
    classifyBtn.mousePressed(classifyDrawing);
    
}

// Callback: chamado quando o modelo Handpose está pronto
function handposeModelReady (){
    console.log("Modelo Handpose Carregado!");
}

function classifierModelReady(){
    console.log("Modelo DoodleNet Carregado!");
}

function gotHands(results){
    // 'results' é um array de mãos detectadas
    hands = results;
}

// --- Função de Draw do p5.js ---
function draw() {
    background(220); // Fundo claro

    // 1. Desenha o vídeo (estica para o canvas, SEM espelho)
    image(video, 0, 0, width, height); 

    // 2. Lógica de Desenho
    if (hands.length > 0) {
        let hand = hands[0];
        let index = hand.landmarks[8];
        let thumb = hand.landmarks[4];

        // --- USA MAP() PARA TRADUZIR COORDS ---
        // (video.width/height = tamanho nativo da webcam)
        // (width/height = tamanho do canvas)
        let indexX = map(index[0], 0, video.width, 0, width);
        let indexY = map(index[1], 0, video.height, 0, height);
        let thumbX = map(thumb[0], 0, video.width, 0, width);
        let thumbY = map(thumb[1], 0, video.height, 0, height);
        // --- FIM DO MAP ---

        // Ponto médio (agora com coords mapeadas)
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

    // 3. Desenha a pintura por cima
    image(painting, 0, 0);

    // 4. Desenha os Keypoints (com 'map()')
    drawKeypoints();

    // 5. STATUS (sempre por último)
    fill(0); 
    noStroke();
    textSize(18);

    text("Estado do Agente: " + agentState, 20, 40);
    let distText = (hands.length > 0) ? pinchDist.toFixed(2) : "N/A";
    text("Distância Atual: " + distText, 20, 70);
    text("Limiar (Fixo) " + PINCH_THRESHOLD, 20, 100);

    // Resultados
    fill(255, 0, 0); // Vermelho
    textSize(24);
    textAlign(CENTER);
    text(classificationResult, width / 2, 40);
    textAlign(LEFT);
}

// Desenha os 21 pontos da mão
function drawKeypoints(){
    for (let i = 0; i < hands.length; i++) {
        const hand = hands[i];
        for (let j = 0; j < hand.landmarks.length; j++) {
            const keypoint = hand.landmarks[j];
            fill(0, 255, 0);
            noStroke();
            
            // === USA MAP() ===
            // Traduz o X do vídeo para o X do canvas
            const x = map(keypoint[0], 0, video.width, 0, width);
            // Traduz o Y do vídeo para o Y do canvas
            const y = map(keypoint[1], 0, video.height, 0, height);
            ellipse(x, y, 10, 10);
        }
    }
}

//Atuação
function drawBrush(x, y, px, py) { // <-- CORREÇÃO 1: Aceita os argumentos
    if (px === 0 && py === 0) { return; }
        painting.stroke(0); // Pincel preto
        painting.strokeWeight(10);
        painting.noFill();
        painting.line(x, y, px, py);
}

// Limpa o canvas de desenho
function clearDrawing(){
    painting.clear();
    classificationResult = "Desenhe algo e clique em 'Classificar'"; // Reseta o texto
    console.log("Canvas and Data cleaned!");
}

// Função classificar
function classifyDrawing(){
    classificationResult = "Analisando...";
    const tempGfx = createGraphics(painting.width, painting.height);
    tempGfx.background(255);
    tempGfx.image(painting, 0, 0);
    sketchClassifier.classify(tempGfx, gotResults);
    tempGfx.remove();

}

// Callback com os resultados
function gotResults(error, results){
    if (error){
        console.error(error);
        classificationResult = "Erro ao classificar.";
        return;
    }

    let label = results[0].label;
    let confidence = nf(results[0].confidence * 100, 2, 1);

    classificationResult = `Isso é um (a) ${label} (${confidence}%)`;
    console.log(results);
}