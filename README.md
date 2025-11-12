# Agente Visual HandPose
*Uma experiência interativa de **visão computacional** + **machine learning** em tempo real*  

## Stack

| Camada | Tecnologia | Função |
|-------|------------|--------|
| **Frontend / Canvas** | **[p5.js](https://p5js.org/)** | Renderização em tempo real, desenho, interface fluida |
| **IA de Detecção de Mãos** | **[ml5.js](https://ml5js.org/)** + **Handpose (MediaPipe)** | Detecta 21 pontos (landmarks) da mão em vídeo |
| **Classificação de Desenhos** | **DoodleNet (pré-treinado)** | Reconhece desenhos à mão livre (ex: "gato", "coração") |
| **Captura de Vídeo** | **Webcam API (getUserMedia)** | Acesso à câmera do dispositivo |

---

## Principais Conceitos Computacionais

### 1. **Visão Computacional**
- **Detecção de landmarks**: O modelo Handpose identifica **21 pontos-chave** em cada mão (pontas dos dedos, juntas, etc).
- **Rastreamento em tempo real**: Processa ~30 FPS mesmo em dispositivos móveis.

### 2. **Mapeamento de Coordenadas com Escala e Offset**

```js
map(x, 0, video.width, 0, canvas.width)
```

- Converte coordenadas da webcam (1280×960) para a tela do usuário.
- Usa escala proporcional e offset central para manter alinhamento perfeito em qualquer resolução.

### 3. **Interação por Gestos (Pinch-to-Draw)**

- Distância euclidiana entre polegar e indicador:

```js 
dist(indexX, indexY, thumbX, thumbY)
```

- Se < 45px → modo "agarrar" → desenha
- Se ≥ 45px → modo "rastrear" → apenas move o cursor

### 4. **Canvas Offscreen (createGraphics)**

```js
painting = createGraphics(1280, 960)
```

- Desenha em um canvas "invisível" para:
- Manter o desenho fixo
- Redimensionar para o classificador (256×256)