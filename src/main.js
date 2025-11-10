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
    createCanvas(1280, 960);

    // Inicia a tela de pintura (lógica TCT)
    painting = createGraphics(1280, 960);
    painting.clear();
    
    // Configura a captura de vídeo (lógica TCT)
    video = createCapture({ video: true, audio: false });
    //video.size(1280, 960);
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

    push();
    translate(width, 0);
    scale(-1, 1);

    // 1. Desenha o vídeo espelhado (lógica TCT)
    image(video, 0, 0, width, height);

    // 2. Lógica de Desenho TCT (adaptada para nossa sintaxe)
    if (hands.length > 0) {
        let hand = hands[0];
        // (A TCT usa 'index_finger_tip', mas nosso ML5 CDN (0.12.2) usa 'landmarks')
        let index = hand.landmarks[8];
        let thumb = hand.landmarks[4];

        // Ponto médio (lógica TCT)
        let x = (index[0] + thumb[0]) / 2;
        let y = (index[1] + thumb[1]) / 2;

        // Distância (lógica TCT)
        pinchDist = dist(index[0], index[1], thumb[0], thumb[1]);

        // Crítico (lógica TCT + nosso limiar)
        if (pinchDist < PINCH_THRESHOLD) {
            agentState = "GRABBING";
            drawBrush(x, y, px, py);
        } else {
            agentState = "TRACKING";
        }

        // Atualiza o anterior (lógica TCT)
        px = x;
        py = y;

    } else {
        px = 0;
        py = 0;
        agentState = "IDLE";
    }

    // 3. Desenha a pintura por cima (lógica TCT)
    image(painting, 0, 0);

    // 4. Desenha os Keypoints (agora sem 'map()')
    drawKeypoints();

    pop();

    // 5. STATUS (Nosso código, agora lendo as globais simples)
    fill(0); // Preto (para o fundo claro)
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
    for (let i = 0; i < hands.length; i++) { // Usa 'hands'
        const hand = hands[i];
        for (let j = 0; j < hand.landmarks.length; j++) {
            const keypoint = hand.landmarks[j];
            fill(0, 255, 0);
            noStroke();
            ellipse(keypoint[0], keypoint[1], 10, 10); // Sem 'map'
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