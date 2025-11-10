// Captura da webcam
let video;

// Handpose
let handpose;
let predictions = []; // Armazena as detecções

// Variáveis para calcular a velocidade
let prevHandX = 0; 
let prevHandY = 0;

// Crítico
const PINCH_THRESHOLD = 45;
const SPEED_THRESHOLD = 8;

// Métricas
let agentMetrics = {
    speed: 0,
    pinchDist: 0,
    agentX: 0, // Posição X do agente
    agentY: 0, // Posição Y do agente
    agentSize: 10 // Tamanho do agente
};

// Feedback
let agentState = "IDLE"; //// IDLE (Ocioso), TRACKING (Rastreando), GRABBING (Agarrando)
let prevState = "IDLE";

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

    background(50);
    
    if (predictions.length > 0){
        calculateMetrics(predictions[0]);
        updateCritic();

        if (agentState === "GRABBING"){

            if (prevState === "GRABBING"){
                drawBrush();
            }
            
        }

        prevHandX = agentMetrics.agentX;
        prevHandY = agentMetrics.agentY;
        prevState = agentState;

    } else {
        prevHandX = 0;
        prevHandY = 0;
        agentState = "IDLE";
        prevState = "IDLE";
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

    // Métrica 1: Posição do Agente
    agentMetrics.agentX = indexX;
    agentMetrics.agentY = indexY;
    
    // Métrica 2: Distância da Pinça
    agentMetrics.pinchDist = dist(indexX, indexY, thumbX, thumbY);
    
    // Métrica 3: Tamanho do Agente (derivado da pinça)
    agentMetrics.agentSize = map(agentMetrics.pinchDist, 20, 200, 10, 60, true);
    
    // Métrica 4: Velocidade (baseada no dedo indicador)
    agentMetrics.speed = dist(indexX, indexY, prevHandX, prevHandY);

}

// O "CRÍTICO"
// Avalia as métricas e define o 'agentState'.
// Este 'agentState' é o feedback para os outros elementos.
function updateCritic() {
    
    // Avalia a pinça
    if (agentMetrics.pinchDist < PINCH_THRESHOLD) 
    {
        agentState = "GRABBING";
    } else {
        agentState = "TRACKING";
    }
}



//Atuação

function drawBrush(){

    if (prevHandX === 0 || prevHandY === 0){
        return;
    }

    drawingCanvas.stroke(255);
    drawingCanvas.strokeWeight(10);
    drawingCanvas.noFill();

    drawingCanvas.line(
        agentMetrics.agentX,
        agentMetrics.agentY,
        prevHandX,
        prevHandY
    );
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

    sketchClassifier.classify(drawingCanvas, gotResults);
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