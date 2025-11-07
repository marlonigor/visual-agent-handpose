// Captura da webcam
let video;

// Handpose
let handpose;
let predictions = []; // Armazena as detecções

// Variáveis para calcular a velocidade
let prevHandX = 0; 
let prevHandY = 0;

// Crítico
const PINCH_THRESHOLD = 60;
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

// --- Função de Setup do p5.js ---
function setup() {
    // Cria o canvas com o tamanho total da janela
    createCanvas(windowWidth, windowHeight);
    
    // Configura a captura de vídeo (webcam)
    video = createCapture(VIDEO);

    // Inicializa o modelo Handpose
    // Passa o vídeo e a função 'modelReady' como callback
    handpose = ml5.handpose(video, modelReady);

    // Define um ouvinte (listener)
    // Sempre que o handpose detectar algo, ele chama a função 'gotPredictions'
    handpose.on("predict", gotPredictions);

    // Esconde o elemento de vídeo extra 
    video.hide();
    
}

// Callback: chamado quando o modelo Handpose está pronto
function modelReady (){
    console.log("Modelo Handpose Carregado!");
}

function gotPredictions(results){
    // 'results' é um array de mãos detectadas
    predictions = results;
}

// --- Função de Draw do p5.js ---
function draw() {
    // Espelhamento
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height); // Desenha a imagem da webcam no canvas

    if (predictions.length > 0){
        calculateMetrics(predictions[0]);
        updateCritic();
    } else {
        prevHandX = 0;
        prevHandY = 0;
        agentState = "IDLE";
    }


    drawKeypoints();

    drawAgent();

    // STATUS
    fill(255); 
    noStroke();
    textSize(20);

    if(predictions.length > 0){
        text("Mão detectada!", width - 180, 30);
    } else {
        text("Procurando mão...", width - 200, 30);
    }
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

// Atuação
function drawAgent(){
    
// O Agente (Elemento de Desempenho) só atua se não estiver Ocioso
    if (agentState !== "IDLE") {
        
        let agentColor;
        
        // O Agente REAGE ao feedback do Crítico
        if (agentState === "GRABBING") {
            agentColor = color(0, 255, 150); // Verde (Sucesso/Agarrado)
        } else { // (agentState === "TRACKING")
            agentColor = color(0, 150, 255); // Azul (Rastreando)
        }
        
        // Atuação
        fill(agentColor);
        noStroke();
        drawingContext.shadowBlur = 32;
        drawingContext.shadowColor = agentColor;
        
        ellipse(
            agentMetrics.agentX, 
            agentMetrics.agentY, 
            agentMetrics.agentSize, 
            agentMetrics.agentSize
        );
        
        drawingContext.shadowBlur = 0;
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
    
    // Atualiza a posição anterior para o próximo frame
    prevHandX = indexX;
    prevHandY = indexY;
}

// O "CRÍTICO"
// Avalia as métricas e define o 'agentState'.
// Este 'agentState' é o feedback para os outros elementos.
function updateCritic() {
    
    // Avaliação: A pinça está fechada E a mão está parada?
    if (agentMetrics.pinchDist < PINCH_THRESHOLD && 
        agentMetrics.speed < SPEED_THRESHOLD) 
    {
        // Feedback: "Sucesso! Agarrando."
        agentState = "GRABBING";
    } else {
        // Feedback: "Rastreando..."
        agentState = "TRACKING";
    }
}