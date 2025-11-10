// Captura da webcam
let video;

// Handpose
let handpose;
let predictions = []; // Armazena as detecções


// Lógica TCT
let px = 0;
let py = 0;

// Crítico
const PINCH_THRESHOLD = 45;

// Métricas
let agentMetrics = {
    pinchDist: 0,
    indexX: 0,
    indexY: 0,
    thumbX: 0,
    thumbY: 0
};

// Feedback
let agentState = "IDLE"; //// IDLE (Ocioso), TRACKING (Rastreando), GRABBING (Agarrando)

// Gerador de Problemas
const problemList = ["Círculo", "Quadrado", "Triângulo", "Linha Horizontal"];
let currentProblem = "";

// Tela de Pintura
let drawingCanvas;

let sketchClassifier;

let classificationResult = "Desenhe algo e clique em 'Classificar'";

// --- Função de Setup do p5.js ---
function setup() {
    // Cria o canvas com o tamanho total da janela
    createCanvas(windowWidth, windowHeight);

    px = 0;
    py = 0;

    // Inicia a tela de pintura
    drawingCanvas = createGraphics(windowWidth, windowHeight);
    drawingCanvas.clear();
    
    // Configura a captura de vídeo (webcam)
    video = createCapture(VIDEO);

    // Inicializa o modelo Handpose
    // Passa o vídeo e a função 'modelReady' como callback
    handpose = ml5.handpose(video, handposeModelReady);

    sketchClassifier = ml5.imageClassifier('DoodleNet', classifierModelReady);

    // Define um ouvinte (listener)
    // Sempre que o handpose detectar algo, ele chama a função 'gotPredictions'
    handpose.on("predict", gotPredictions);

    // Esconde o elemento de vídeo extra 
    video.hide();

    const clearBtn = select('#clearButton')
    clearBtn.mousePressed(clearDrawing);

    const classifyBtn = select('#btnClassify');
    classifyBtn.mousePressed(classifyDrawing);

    generateNewProblem();
    
}

// Callback: chamado quando o modelo Handpose está pronto
function handposeModelReady (){
    console.log("Modelo Handpose Carregado!");
}

function classifierModelReady(){
    console.log("Modelo DoodleNet Carregado!");
}

function gotPredictions(results){
    // 'results' é um array de mãos detectadas
    predictions = results;
}

// --- Função de Draw do p5.js ---
function draw() {

    background(220);
    
    if (predictions.length > 0){
        calculateMetrics(predictions[0]);

        let x = (agentMetrics.indexX + agentMetrics.thumbX) / 2;
        let y = (agentMetrics.indexY + agentMetrics.thumbY) / 2;

        if (agentMetrics.pinchDist < PINCH_THRESHOLD){
            drawBrush(x, y, px, py);
        }

        px = x;
        py = y;

    } else {
        px = 0;
        py = 0;
        agentState = "IDLE";
    }

    push();

    // Espelhamento
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height); // Desenha a imagem da webcam no canvas

    drawKeypoints();

    image(drawingCanvas, 0, 0);

    pop();

    // STATUS
    fill(255); 
    noStroke();
    textSize(18);

    // Definições do Crítico
    text("Estado do Agente: " + agentState, 20, 40);
    let distText = (predictions.length > 0) ? agentMetrics.pinchDist.toFixed(2) : "N/A";
    text("Distância Atual: " + distText, 20, 70);
    text("Limiar (Fixo) " + PINCH_THRESHOLD, 20, 100);

    // Resultados
    fill(255, 255, 0);
    textSize(24);
    textAlign(CENTER);
    text(classificationResult, width / 2, 40);
    textAlign(LEFT);
    
}

// Desenha os 21 pontos da mão
function drawKeypoints(){
    for (let i = 0; i < predictions.length; i++){
        const hand = predictions[i];

        // Itera por todos os pontos (landmarks) da mão
        for (let j = 0; j < hand.landmarks.length; j++){
            const keypoint = hand.landmarks[j];

            // Desenha um círculo verde em cada ponto
            fill (0, 255, 0);
            noStroke();

            // Aspect Ratio
            const x = map (keypoint[0], 0, video.width, 0, width);

            const y = map (keypoint[1], 0, video.height, 0, height);

            ellipse (x, y, 10, 10); // keypoint[0] = X, keypoint[1] = Y
        }
    }
}

// Percepção
function calculateMetrics(hand) {
    // Pontos-chave
    const indexFinger = hand.landmarks[8];
    const thumb = hand.landmarks[4];
    
    // Mapeia posições (Corrigido)
    const indexX = map(indexFinger[0], 0, video.width, 0, width);
    const indexY = map(indexFinger[1], 0, video.height, 0, height);
    const thumbX = map(thumb[0], 0, video.width, 0, width);
    const thumbY = map(thumb[1], 0, video.height, 0, height);
    
    // --- ATUALIZA AS MÉTRICAS ---

    // Métrica 1: Posição 
    agentMetrics.agentX = indexX;
    agentMetrics.agentY = indexY;
    agentMetrics.thumbX = thumbX;
    agentMetrics.thumbY = thumbY;
    
    // Métrica 2: Distância da Pinça
    agentMetrics.pinchDist = dist(indexX, indexY, thumbX, thumbY);
       
}

//Atuação
function drawBrush(x, y, px, py) { // <-- CORREÇÃO 1: Aceita os argumentos

    // CORREÇÃO 2: A lógica de "reset" agora checa por 0,
    // (conforme definimos no 'setup')
    if (px === 0 && py === 0){ 
       return; // Não desenha a linha vinda de (0,0)
    }

    drawingCanvas.stroke(0);
    drawingCanvas.strokeWeight(10);
    drawingCanvas.noFill();
    drawingCanvas.line(x, y, px, py);
}

// Limpa o canvas de desenho
function clearDrawing(){
    drawingCanvas.clear();
    classificationResult = "Desenhe algo e clique em 'Classificar'"; // Reseta o texto
    console.log("Canvas and Data cleaned!");
}

// A função geradora de problemas
function generateNewProblem(){
    currentProblem = random(problemList);

    console.log("Novo Problema Gerado: ", currentProblem);
}

// Função classificar
function classifyDrawing(){
    classificationResult = "Analisando...";

    const tempGfx = createGraphics(drawingCanvas.width, drawingCanvas.height);

    tempGfx.background(255);

    tempGfx.image(drawingCanvas, 0, 0);

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