// Variável global para armazenar a captura da webcam
let video;

// --- Função de Setup do p5.js ---
// É executada uma única vez no início
function setup() {
    // Cria o canvas com o tamanho total da janela
    createCanvas(windowWidth, windowHeight);
    
    // Configura a captura de vídeo (webcam)
    // Isso pedirá permissão ao usuário
    video = createCapture(VIDEO);
    
    // Esconde o elemento de vídeo extra que o createCapture cria,
    // pois vamos desenhar os pixels no canvas manualmente.
    video.hide();
    
    console.log("Setup concluído: Canvas e Webcam prontos.");
}

// --- Função de Draw do p5.js ---
// É executada continuamente em loop
function draw() {
    // Define a cor de fundo (um cinza escuro)
    // O '20' no final é a opacidade (alfa), para criar um leve rastro
    background(50, 20); 

    // --- AQUI VAI A LÓGICA DO AGENTE ---
    // Por enquanto, vamos apenas desenhar um círculo onde o mouse está
    
    fill(255, 0, 0); // Cor de preenchimento: Vermelho
    noStroke(); // Sem contorno
    ellipse(mouseX, mouseY, 30, 30); // Desenha um círculo de 30px
}