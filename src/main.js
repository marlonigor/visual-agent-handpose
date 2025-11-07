// Captura da webcam
let video;

// Handpose
let handpose;
let predictions = []; // Armazena as detecções

// --- Função de Setup do p5.js ---
function setup() {
    // Cria o canvas com o tamanho total da janela
    createCanvas(windowWidth, windowHeight);
    
    // Configura a captura de vídeo (webcam)
    // Isso pedirá permissão ao usuário
    video = createCapture(VIDEO);
    video.size(width, height); // Garante que o vídeo tenha o tamanho do canvas
    
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
    // Define a cor de fundo (um cinza escuro)
    // O '20' no final é a opacidade (alfa), para criar um leve rastro
    background(50); 

    // Espelhamento
    translate(width, 0);
    scale(-1, 1);

    image(video, 0, 0, width, height); // Desenha a imagem da webcam no canvas

    drawKeypoints();

    // Desenha o agente visual
    drawAgent();

    // STATUS
    fill(255); 
    noStroke(); // Sem contorno
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

function drawAgent(){
    
    // Só executa se houver uma mão
    if (predictions.length > 0) {
        const hand = predictions[0];
        
        // Pega o keypoint 8 (ponta do dedo indicador)
        const indexFinger = hand.landmarks[8];
        
        // --- IMPORTANTE: Mapear as coordenadas ---
        // Exatamente como fizemos no drawKeypoints()
        const x = map(indexFinger[0], 0, video.width, 0, width);
        const y = map(indexFinger[1], 0, video.height, 0, height);
        
        // Desenha o "agente" (uma esfera de luz azul)
        fill(0, 150, 255); // Azul brilhante
        noStroke();
        // Adiciona um brilho sutil
        drawingContext.shadowBlur = 32;
        drawingContext.shadowColor = color(0, 150, 255);
        
        ellipse(x, y, 30, 30);
        
        // Reseta o brilho para não afetar outros elementos
        drawingContext.shadowBlur = 0;
    }

}