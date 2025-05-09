// --- Variáveis Globais e Constantes ---
const canvas = document.getElementById('damasCanvas');
const ctx = canvas.getContext('2d');
const boardSize = 8; // Tabuleiro 8x8
let squareSize = 60; // Valor inicial, será recalculado
let board = [];      // Representação do tabuleiro: null ou { player: boolean, color: string, isKing: boolean }
let playerTurn = true; // true: jogador (verde), false: máquina (rosa)
let selectedPiece = null; // Guarda a peça selecionada: { row, col }
let possibleMoves = []; // Guarda os movimentos possíveis para a peça selecionada: { row, col, capturedPiece? }
let difficultyLevel = 'medium'; // Nível de dificuldade inicial
let playerWins = 0;    // Placar do jogador
let machineWins = 0;   // Placar da máquina
let isPlayerMultiCapture = false; // Flag para indicar captura múltipla do jogador
let isMachineThinking = false; // Flag para evitar cliques enquanto a máquina pensa

// --- Cores (devem corresponder às variáveis CSS :root) ---
const colorPlayer = '#50fa7b';     // Verde Neon (Jogador)
const colorMachine = '#ff79c6';    // Rosa Neon (Máquina)
const colorLightSquare = '#6272a4'; // Cinza Médio (Quadrado claro)
const colorDarkSquare = '#44475a';  // Cinza Escuro (Quadrado escuro)
const colorHighlight = 'rgba(241, 250, 140, 0.6)'; // Amarelo Neon Transparente (Movimento possível)
const colorSelected = 'rgba(189, 147, 249, 0.5)'; // Roxo Claro Transparente (Peça selecionada)
const colorKingIndicator = '#1a1a2e'; // Cor escura para o 'K' da Dama (contraste)
const colorPieceBorder = 'rgba(255, 255, 255, 0.15)'; // Borda sutil branca/transparente na peça
const colorHighlightBorder = 'rgba(255, 255, 255, 0.3)'; // Borda sutil no destaque de movimento

// --- Funções de Inicialização e Desenho ---

/**
 * Calcula o tamanho de cada quadrado do tabuleiro baseado
 * no tamanho atual do container do canvas e redimensiona o canvas.
 * Chamado na inicialização e no redimensionamento da janela.
 */
function calculateSquareSize() {
    const containerWidth = canvas.parentElement.clientWidth;
    // Garante que a largura seja pelo menos 1px para evitar erros
    const effectiveWidth = Math.max(1, containerWidth);
    canvas.width = effectiveWidth;
    canvas.height = effectiveWidth; // Mantém aspect-ratio 1:1
    squareSize = canvas.width / boardSize;

    // Redesenha apenas se o tabuleiro já foi inicializado
    if (board.length > 0) {
        drawBoard();
    }
}


/**
 * Inicializa o tabuleiro com as peças nas posições iniciais,
 * reseta o estado do jogo e chama o desenho inicial.
 */
function initializeBoard() {
    board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));

    // Peças do Jogador (Verde - começam em baixo no array, linhas 0, 1, 2)
    for (let r = 0; r < 3; r++) {
        for (let c = (r + 1) % 2; c < boardSize; c += 2) {
            board[r][c] = { player: true, color: colorPlayer, isKing: false };
        }
    }
    // Peças da Máquina (Rosa - começam em cima no array, linhas 5, 6, 7)
    for (let r = boardSize - 3; r < boardSize; r++) {
        for (let c = (r + 1) % 2; c < boardSize; c += 2) {
            board[r][c] = { player: false, color: colorMachine, isKing: false };
        }
    }

    playerTurn = true; // Jogador sempre começa
    selectedPiece = null;
    possibleMoves = [];
    isPlayerMultiCapture = false;
    isMachineThinking = false;

    console.log("Tabuleiro inicializado. Dificuldade:", difficultyLevel);
    calculateSquareSize(); // Calcula tamanho e desenha o tabuleiro inicial
}

/**
 * Desenha o estado atual do tabuleiro, peças, destaques e indicadores no canvas.
 */
function drawBoard() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            // Desenha o Quadrado
            ctx.fillStyle = (row + col) % 2 === 0 ? colorLightSquare : colorDarkSquare;
            ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);

            // Desenha Destaque para Movimentos Possíveis
            if (possibleMoves.some(move => move.row === row && move.col === col)) {
                ctx.fillStyle = colorHighlight;
                const padding = squareSize * 0.05;
                const innerSize = squareSize - 2 * padding;
                // Desenha um círculo destacado em vez de quadrado para melhor visualização
                const centerX = col * squareSize + squareSize / 2;
                const centerY = row * squareSize + squareSize / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerSize / 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = colorHighlightBorder;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Desenha a Peça
            const piece = board[row][col];
            if (piece) {
                const centerX = col * squareSize + squareSize / 2;
                const centerY = row * squareSize + squareSize / 2;
                const radius = squareSize / 2 * 0.75; // Raio da peça

                // Destaque para Peça Selecionada (círculo externo)
                if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                    ctx.fillStyle = colorSelected;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius + squareSize * 0.08, 0, Math.PI * 2); // Um pouco maior que a peça
                    ctx.fill();
                }

                // Círculo da Peça
                ctx.fillStyle = piece.color;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();

                // Efeito de Brilho (gradiente radial)
                const gradient = ctx.createRadialGradient(
                    centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1, // Ponto de luz deslocado
                    centerX, centerY, radius // Do ponto de luz ao centro/borda da peça
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)'); // Mais claro no centro/ponto de luz
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');    // Mais escuro nas bordas
                ctx.fillStyle = gradient;
                ctx.fill(); // Aplica o gradiente sobre a cor base

                // Borda Sutil na Peça
                ctx.strokeStyle = colorPieceBorder;
                ctx.lineWidth = 1;
                ctx.stroke(); // Desenha a borda do círculo

                // Indicador de Dama ('K')
                if (piece.isKing) {
                    ctx.fillStyle = colorKingIndicator; // Cor de contraste para o 'K'
                    // Ajusta o tamanho da fonte dinamicamente com o tamanho do quadrado/peça
                    ctx.font = `bold ${Math.max(10, radius * 0.8)}px 'Orbitron', sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('K', centerX, centerY);
                }
            }
        }
    }
     // Adiciona feedback visual se a máquina estiver pensando
     if (isMachineThinking) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Overlay escuro semi-transparente mais forte
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${Math.max(14, canvas.width * 0.04)}px 'Segoe UI', sans-serif`; // Tamanho de fonte responsivo
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // Centraliza verticalmente
        ctx.fillText("Máquina pensando...", canvas.width / 2, canvas.height / 2);
    }
}

// --- Lógica do Jogo ---

/** Verifica se a posição (linha, coluna) é válida dentro dos limites do tabuleiro. */
function isValidPosition(row, col) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

/**
 * Obtém todos os movimentos possíveis (capturas obrigatórias ou movimentos normais)
 * para uma peça específica em uma dada posição do tabuleiro.
 * Prioriza capturas se existirem para QUALQUER peça do jogador atual.
 */
function getPossibleMovesForPiece(pieceRow, pieceCol, currentBoard) {
    const piece = currentBoard[pieceRow]?.[pieceCol];
    if (!piece) return []; // Retorna array vazio se não houver peça

    const isPlayer = piece.player; // Identifica o jogador da peça
    const mandatoryCaptures = getAllMandatoryCaptures(isPlayer, currentBoard); // Verifica capturas obrigatórias para ESTE jogador

    let pieceMoves = [];

    // Verifica se existem capturas obrigatórias para este jogador
    if (mandatoryCaptures.length > 0) {
        // Se há capturas obrigatórias, SÓ retorna os movimentos de captura desta peça específica, se ela puder capturar
        pieceMoves = getCaptureMovesForPiece(pieceRow, pieceCol, currentBoard);
    } else {
        // Se NÃO há capturas obrigatórias para o jogador, calcula os movimentos normais desta peça
        pieceMoves = getNormalMovesForPiece(pieceRow, pieceCol, currentBoard);
    }

    return pieceMoves;
}

/** Obtém apenas os movimentos NORMAIS (sem captura) para uma peça. */
function getNormalMovesForPiece(pieceRow, pieceCol, currentBoard) {
    const piece = currentBoard[pieceRow]?.[pieceCol];
    if (!piece) return [];
    let normalMoves = [];

    // Define as direções de movimento: Jogador (true) move para frente (r aumenta), Máquina (false) move para frente (r diminui)
    const forwardRowDirection = piece.player ? 1 : -1;
    const forwardDirections = [[forwardRowDirection, -1], [forwardRowDirection, 1]]; // Diagonal frente-esquerda e frente-direita
    const allDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Todas as 4 diagonais para a Dama

    const directions = piece.isKing ? allDirections : forwardDirections; // Dama usa todas, peça normal só as frontais

    for (const [dr, dc] of directions) {
        if (piece.isKing) {
            // Lógica de movimento da Dama (pode deslizar)
            let currentRow = pieceRow + dr;
            let currentCol = pieceCol + dc;
            while (isValidPosition(currentRow, currentCol)) {
                if (!currentBoard[currentRow][currentCol]) { // Se a casa está vazia
                    normalMoves.push({ row: currentRow, col: currentCol }); // Adiciona como movimento possível
                    currentRow += dr; // Continua na mesma direção
                    currentCol += dc;
                } else {
                    break; // Bloqueado por outra peça (aliada ou inimiga)
                }
            }
        } else {
            // Lógica de movimento da Peça Normal (um passo)
            const newRow = pieceRow + dr;
            const newCol = pieceCol + dc;
            if (isValidPosition(newRow, newCol) && !currentBoard[newRow][newCol]) { // Se a posição é válida e vazia
                normalMoves.push({ row: newRow, col: newCol }); // Adiciona como movimento possível
            }
        }
    }
    return normalMoves;
}


/** Obtém apenas os movimentos de CAPTURA possíveis para uma peça específica. */
function getCaptureMovesForPiece(pieceRow, pieceCol, currentBoard) {
    const piece = currentBoard[pieceRow]?.[pieceCol];
    if (!piece) return []; // Retorna array vazio se não houver peça
    let captureMoves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Verifica todas as 4 diagonais para captura

    for (const [dr, dc] of directions) {
        if (piece.isKing) {
            // Lógica de Captura da Dama (pode pular sobre uma peça e pousar em qualquer casa vazia depois)
            let opponentRow = -1, opponentCol = -1;
            let foundOpponent = false;
            let currentRow = pieceRow + dr;
            let currentCol = pieceCol + dc;

            while (isValidPosition(currentRow, currentCol)) {
                const targetSquare = currentBoard[currentRow][currentCol];
                if (targetSquare) { // Encontrou uma peça
                    if (!foundOpponent && targetSquare.player !== piece.player) {
                        // Encontrou a PRIMEIRA peça oponente nesta direção
                        foundOpponent = true;
                        opponentRow = currentRow;
                        opponentCol = currentCol;
                    } else {
                        // Bloqueado por outra peça (aliada ou segunda oponente)
                        break;
                    }
                } else { // Casa vazia
                    if (foundOpponent) {
                        // Se já pulou um oponente, qualquer casa vazia subsequente é um pouso válido
                        captureMoves.push({
                            row: currentRow,
                            col: currentCol,
                            capturedPiece: { row: opponentRow, col: opponentCol } // Guarda a peça capturada
                        });
                        // A Dama pode escolher onde pousar após a captura, então continuamos procurando pousos vazios na mesma linha
                    }
                }
                // Importante: Se encontrou uma peça DEPOIS de já ter encontrado o oponente,
                // não pode continuar procurando pousos (não pode pular duas peças ou pular aliado)
                 if (targetSquare && foundOpponent) {
                     break;
                 }

                currentRow += dr; // Continua na mesma direção
                currentCol += dc;
            }
        } else {
            // Lógica de Captura da Peça Normal (pula exatamente uma casa)
            const jumpRow = pieceRow + dr; // Posição da peça a ser pulada
            const jumpCol = pieceCol + dc;
            const landRow = pieceRow + 2 * dr; // Posição de pouso após o pulo
            const landCol = pieceCol + 2 * dc;

            // Verifica se a posição de pouso é válida
            if (isValidPosition(landRow, landCol)) {
                const jumpedPiece = currentBoard[jumpRow]?.[jumpCol]; // Peça na casa pulada
                const landingSquare = currentBoard[landRow][landCol]; // Casa de pouso

                // Verifica se há uma peça oponente para pular E se a casa de pouso está vazia
                if (jumpedPiece && jumpedPiece.player !== piece.player && !landingSquare) {
                    captureMoves.push({
                        row: landRow, // Posição de pouso
                        col: landCol,
                        capturedPiece: { row: jumpRow, col: jumpCol } // Guarda a peça capturada
                    });
                }
            }
        }
    }
    return captureMoves;
}


/**
 * Obtém uma lista de TODOS os movimentos de captura obrigatória disponíveis
 * para um determinado jogador (isPlayer: true para jogador, false para máquina)
 * no estado atual do tabuleiro.
 * Retorna um array de objetos, cada um contendo a posição de origem (fromRow, fromCol)
 * e os detalhes do movimento de captura (row, col, capturedPiece).
 */
function getAllMandatoryCaptures(isPlayer, currentBoard) {
    let mandatoryMoves = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = currentBoard[r][c];
            // Verifica se a peça existe e pertence ao jogador especificado
            if (piece && piece.player === isPlayer) {
                // Obtém os movimentos de captura possíveis para esta peça
                const captures = getCaptureMovesForPiece(r, c, currentBoard);
                // Adiciona cada captura encontrada à lista, incluindo a posição de origem
                captures.forEach(captureMove => {
                    mandatoryMoves.push({
                        ...captureMove, // Inclui row, col, capturedPiece
                        fromRow: r,     // Adiciona a linha de origem
                        fromCol: c      // Adiciona a coluna de origem
                    });
                });
            }
        }
    }
    return mandatoryMoves; // Retorna a lista de todas as capturas obrigatórias
}


/** Processa o clique do usuário no canvas. */
function handleCanvasClick(event) {
    // Ignora clique se não for turno do jogador OU se a máquina estiver pensando
    if (!playerTurn || isMachineThinking) {
        if (isMachineThinking) console.log("Aguarde, máquina pensando...");
        else if (!playerTurn) console.log("Não é seu turno.");
        return; // Impede qualquer ação se não for a vez do jogador ou a máquina está ocupada
    }

     // Ignora clique se o jogador estiver OBRIGADO a continuar uma captura múltipla
     // mas clicou fora das opções válidas (o clique em opção válida é tratado abaixo)
     if (isPlayerMultiCapture && selectedPiece) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;
        const row = Math.floor(clickY / squareSize);
        const col = Math.floor(clickX / squareSize);

        const isValidMultiCaptureClick = possibleMoves.some(m => m.row === row && m.col === col);
        if (!isValidMultiCaptureClick) {
            console.log("Captura múltipla: Selecione um dos movimentos de captura destacados.");
            return; // Sai se o clique não for em um dos movimentos de multi-captura
        }
        // Se for um clique válido, a lógica continua abaixo para processar o movimento
     }


    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;
    const row = Math.floor(clickY / squareSize);
    const col = Math.floor(clickX / squareSize);

    if (!isValidPosition(row, col)) return; // Sai se clicou fora do tabuleiro

    if (selectedPiece) {
        // --- Já tem peça selecionada ---
        const move = possibleMoves.find(m => m.row === row && m.col === col);
        if (move) {
            // --- Clicou em movimento válido (seja normal, captura ou multi-captura) ---
            const fromRow = selectedPiece.row;
            const fromCol = selectedPiece.col;
            makeMove(fromRow, fromCol, move, board); // Executa o movimento no tabuleiro principal

            // Verifica se o movimento foi uma captura
            if (move.capturedPiece) {
                // --- Foi uma captura, verifica possibilidade de multi-captura ---
                // Obtém novas capturas possíveis A PARTIR da casa onde a peça pousou (move.row, move.col)
                const moreCaptures = getCaptureMovesForPiece(move.row, move.col, board);
                if (moreCaptures.length > 0) {
                    // --- Multi-captura! ---
                    isPlayerMultiCapture = true; // Marca que o jogador está em multi-captura
                    selectedPiece = { row: move.row, col: move.col }; // Mantém a peça selecionada na nova posição
                    possibleMoves = moreCaptures; // Atualiza os movimentos possíveis para mostrar APENAS as novas capturas
                    drawBoard(); // Redesenha para mostrar a nova situação e os novos movimentos
                    console.log("Captura múltipla! Jogue novamente com a mesma peça.");
                    // NÃO chama endPlayerTurn, o turno continua com o jogador
                    return; // Jogador deve continuar jogando com a mesma peça
                }
            }
             // --- Movimento normal OU fim da sequência de captura ---
             isPlayerMultiCapture = false; // Reseta a flag de multi-captura
             selectedPiece = null;      // Desseleciona a peça
             possibleMoves = [];        // Limpa os movimentos possíveis
             endPlayerTurn();           // Passa o turno para a máquina

        } else {
            // --- Clicou fora dos movimentos válidos ---
            // Permite trocar de peça clicando em OUTRA peça sua,
            // DESDE QUE não esteja em meio a uma multi-captura obrigatória.
            if (!isPlayerMultiCapture) {
                selectPiece(row, col); // Tenta selecionar a nova peça clicada
            } else {
                // Se está em multi-captura, não pode trocar de peça, tem que completar a captura
                console.log("Em captura múltipla, clique em um movimento de captura válido para a peça atual.");
            }
        }
    } else {
        // --- Nenhuma peça selecionada ---
        selectPiece(row, col); // Tenta selecionar a peça clicada
    }
}

/**
 * Tenta selecionar uma peça na posição (row, col).
 * Verifica se é a peça do jogador atual e se há capturas obrigatórias.
 */
function selectPiece(row, col) {
    const piece = board[row]?.[col]; // Obtém a peça na posição clicada

    // 1. Verifica se há uma peça E se pertence ao jogador do turno atual (playerTurn)
    if (piece && piece.player === playerTurn) {
        // 2. Verifica se existem capturas obrigatórias para o jogador atual em QUALQUER lugar do tabuleiro
        const mandatoryCaptures = getAllMandatoryCaptures(playerTurn, board);

        if (mandatoryCaptures.length > 0) {
            // 3. Se HÁ capturas obrigatórias, verifica se ESTA peça específica pode realizar uma delas
            const canThisPieceCapture = mandatoryCaptures.some(mc => mc.fromRow === row && mc.fromCol === col);
            if (canThisPieceCapture) {
                // 4. Se PODE capturar, seleciona a peça e mostra APENAS os movimentos de captura
                selectedPiece = { row, col };
                possibleMoves = getCaptureMovesForPiece(row, col, board); // Busca só capturas
                console.log(`Peça selecionada [${row},${col}] para captura obrigatória.`);
            } else {
                // 5. Se NÃO PODE capturar, mas existe captura obrigatória com OUTRA peça, impede a seleção
                console.log("Seleção inválida: Captura obrigatória com outra peça.");
                selectedPiece = null; // Não seleciona
                possibleMoves = [];   // Não mostra movimentos
                // Poderia opcionalmente destacar as peças que TÊM captura obrigatória
            }
        } else {
            // 6. Se NÃO HÁ capturas obrigatórias, permite a seleção normal
            selectedPiece = { row, col };
            // Mostra todos os movimentos possíveis (que neste caso serão apenas normais)
            possibleMoves = getPossibleMovesForPiece(row, col, board);
            console.log(`Peça selecionada [${row},${col}]. Movimentos:`, possibleMoves.length);
        }
    } else {
        // 7. Clicou em casa vazia ou peça do oponente
        selectedPiece = null; // Desseleciona qualquer peça anterior
        possibleMoves = [];   // Limpa movimentos possíveis
        // console.log("Clique em casa vazia ou peça oponente.");
    }
    drawBoard(); // Atualiza a interface para refletir a seleção ou desseleção
}


/**
 * Executa um movimento no tabuleiro fornecido (pode ser o tabuleiro real ou uma cópia).
 * Move a peça, remove a peça capturada (se houver) e promove para Dama se aplicável.
 *
 * @param {number} fromRow - Linha de origem da peça.
 * @param {number} fromCol - Coluna de origem da peça.
 * @param {object} move - Objeto descrevendo o movimento ({ row, col, capturedPiece? }).
 * @param {Array<Array<object|null>>} targetBoard - O tabuleiro onde o movimento será executado.
 */
function makeMove(fromRow, fromCol, move, targetBoard) {
    // Pega a referência da peça na origem
    const piece = targetBoard[fromRow]?.[fromCol];
    // Validação básica: Verifica se a peça realmente existe na origem
    if (!piece) {
        console.error(`makeMove Erro: Nenhuma peça encontrada em [${fromRow},${fromCol}] no tabuleiro alvo.`);
        return; // Interrompe a função se a peça não existir
    }

    // Cria uma cópia da peça para mover (evita problemas de referência se for objeto)
    const pieceToMove = JSON.parse(JSON.stringify(piece));

    // Move a peça para o destino
    targetBoard[move.row][move.col] = pieceToMove;
    // Limpa a casa de origem
    targetBoard[fromRow][fromCol] = null;

    // Referência à peça JÁ MOVIDA para checar promoção
    const movedPiece = targetBoard[move.row][move.col];

    // Verifica e realiza a promoção para Dama
    if (!movedPiece.isKing) { // Só promove se ainda não for Dama
        // Linha de promoção: última linha para o jogador (true), primeira linha para a máquina (false)
        const promotionRow = movedPiece.player ? boardSize - 1 : 0;
        if (move.row === promotionRow) {
            movedPiece.isKing = true; // Promove a Dama
            // Log apenas se for no tabuleiro principal (board)
            if (targetBoard === board) {
                 console.log(`Peça ${movedPiece.player ? 'do Jogador' : 'da Máquina'} promovida a Dama em [${move.row},${move.col}]!`);
            }
        }
    }

    // Remove a peça capturada, se houver uma definida no objeto 'move'
    if (move.capturedPiece) {
        const capRow = move.capturedPiece.row;
        const capCol = move.capturedPiece.col;
        // Verifica se a peça capturada realmente existe antes de tentar removê-la
        if (targetBoard[capRow]?.[capCol]) {
            targetBoard[capRow][capCol] = null; // Remove a peça capturada
             if (targetBoard === board) { // Log apenas no tabuleiro principal
                 console.log(`Peça capturada em [${capRow},${capCol}]`);
             }
        } else {
             // Aviso se a peça capturada já não estava lá (pode acontecer em simulações complexas ou bugs)
             console.warn(`makeMove Aviso: Tentativa de capturar peça em [${capRow},${capCol}], mas já estava vazia.`);
        }
    }
}


/** Finaliza o turno do jogador, passa a vez para a máquina e agenda a jogada da IA. */
function endPlayerTurn() {
    console.log("Finalizando turno do jogador...");
    playerTurn = false;          // Passa o turno para a máquina
    selectedPiece = null;      // Limpa seleção
    possibleMoves = [];        // Limpa movimentos possíveis
    isPlayerMultiCapture = false; // Garante que a flag de multi-captura seja resetada
    isMachineThinking = true;   // Define que a máquina está "pensando" (bloqueia input do jogador)
    drawBoard();               // Redesenha o tabuleiro (mostra o overlay "pensando")

    // Verifica se o jogo terminou APÓS o movimento do jogador (ex: máquina sem peças ou sem movimentos)
    if (checkGameEnd()) {
        console.log("Jogo terminou após jogada do jogador.");
        isMachineThinking = false; // Libera o estado de "pensando" se o jogo acabou
        drawBoard(); // Atualiza o tabuleiro final sem o overlay
        return; // Não agenda a jogada da máquina
    }

    // Agenda a jogada da máquina após um pequeno atraso (para dar sensação de pensamento)
    const delay = 500 + Math.random() * 500; // Delay entre 0.5s e 1.0s
    console.log(`Agendando turno da máquina em ${delay.toFixed(0)}ms...`);
    setTimeout(machineTurn, delay); // Chama a função machineTurn após o delay
}

// --- Inteligência Artificial (Máquina) ---

/**
 * Avalia o estado atual do tabuleiro do ponto de vista da MÁQUINA.
 * Retorna um score: positivo é bom para a máquina, negativo é bom para o jogador.
 *
 * @param {Array<Array<object|null>>} currentBoard - O estado do tabuleiro a ser avaliado.
 * @returns {number} O score de avaliação do tabuleiro.
 */
function evaluateBoard(currentBoard) {
    let score = 0;
    const kingValue = 1.8;     // Dama vale mais que peça normal
    const pieceValue = 1.0;     // Valor base da peça normal
    const positionalWeight = 0.05; // Peso para incentivar avanço/controle central (simplificado)
    const backRowPenalty = 0.1; // Penalidade por peças na linha inicial (incentiva a movê-las)

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = currentBoard[r][c];
            if (piece) {
                const value = piece.isKing ? kingValue : pieceValue; // Define o valor base (Dama ou Peça)
                const sign = piece.player ? -1 : 1; // Jogador (true) tem score negativo, Máquina (false) tem positivo

                // Score base por peça/dama
                score += sign * value;

                // --- Bônus/Penalidade Posicional ---
                let positionScore = 0;
                if (!piece.player) { // Peça da Máquina (false)
                    // Incentiva a avançar (ir para linhas menores, perto do jogador)
                    positionScore += (boardSize - 1 - r) * positionalWeight;
                    // Penaliza peças presas na linha inicial da máquina
                    if (r === boardSize - 1 && !piece.isKing) {
                        positionScore -= backRowPenalty;
                    }
                } else { // Peça do Jogador (true)
                    // Penaliza o avanço do jogador (linhas maiores são ruins para a máquina)
                    positionScore -= r * positionalWeight;
                     // Penaliza peças do jogador presas na linha inicial dele
                     if (r === 0 && !piece.isKing) {
                        positionScore += backRowPenalty; // Positivo aqui porque é ruim para o jogador, bom para a máquina
                    }
                }
                // Adiciona o score posicional ao score total
                score += sign * positionScore; // Multiplica pelo sinal para que seja vantajoso/desvantajoso corretamente
            }
        }
    }
    // Adiciona um pequeno fator aleatório para desempatar avaliações idênticas
    // Isso evita que a IA fique presa em loops ou jogue sempre da mesma forma
    score += (Math.random() - 0.5) * 0.01;
    return score;
}


/**
 * Simula a execução de um movimento e suas possíveis multi-capturas subsequentes
 * em uma CÓPIA do tabuleiro, sem modificar o tabuleiro original.
 *
 * @param {number} fromRow - Linha de origem do movimento inicial.
 * @param {number} fromCol - Coluna de origem do movimento inicial.
 * @param {object} initialMove - O objeto do movimento inicial { row, col, capturedPiece?, fromRow?, fromCol? }.
 * @param {Array<Array<object|null>>} currentBoard - O tabuleiro atual (será copiado).
 * @returns {Array<Array<object|null>>} Uma NOVA cópia do tabuleiro após o movimento e multi-capturas.
 */
function simulateMove(fromRow, fromCol, initialMove, currentBoard) {
    // Cria uma cópia profunda do tabuleiro para não afetar o original
    const boardCopy = JSON.parse(JSON.stringify(currentBoard));

    // Executa o movimento inicial na cópia
    // Precisamos reconstruir o objeto 'move' esperado por makeMove
    const moveForMakeMove = {
        row: initialMove.row,
        col: initialMove.col,
        capturedPiece: initialMove.capturedPiece
    };
    makeMove(fromRow, fromCol, moveForMakeMove, boardCopy);

    // Verifica e simula multi-capturas APENAS se o movimento inicial foi uma captura
    if (initialMove.capturedPiece) {
        let lastLandedRow = initialMove.row; // Posição onde a peça pousou após a primeira captura
        let lastLandedCol = initialMove.col;
        let depth = 0; // Contador para evitar loops infinitos
        const maxMultiCaptureDepth = 8; // Limite de capturas seguidas na simulação

        while (depth < maxMultiCaptureDepth) {
            // Pega a peça que acabou de se mover na cópia do tabuleiro
            const currentPiece = boardCopy[lastLandedRow]?.[lastLandedCol];
            // Se a peça não existir mais (improvável, mas seguro checar), para
            if (!currentPiece) break;

            // Verifica se HÁ MAIS CAPTURAS possíveis a partir da posição atual
            const potentialCaptures = getCaptureMovesForPiece(lastLandedRow, lastLandedCol, boardCopy);

            if (potentialCaptures.length > 0) {
                // --- Simula a próxima captura ---
                // Na simulação, geralmente pegamos a *primeira* multi-captura encontrada.
                // Uma IA mais avançada poderia explorar todas as opções de multi-captura.
                const nextCapture = potentialCaptures[0]; // Pega a primeira opção de multi-captura

                // Prepara o objeto 'move' para a próxima chamada de makeMove
                 const nextMoveForMakeMove = {
                    row: nextCapture.row,
                    col: nextCapture.col,
                    capturedPiece: nextCapture.capturedPiece
                };

                // Executa a multi-captura na cópia do tabuleiro
                makeMove(lastLandedRow, lastLandedCol, nextMoveForMakeMove, boardCopy);

                // Atualiza a posição da peça para a próxima iteração
                lastLandedRow = nextCapture.row;
                lastLandedCol = nextCapture.col;
                depth++; // Incrementa o contador de profundidade da multi-captura
            } else {
                // Sem mais capturas possíveis a partir desta posição, encerra a simulação de multi-captura
                break;
            }
        }
         // Aviso se o limite de profundidade foi atingido (pode indicar um loop ou cenário muito complexo)
         if (depth >= maxMultiCaptureDepth) {
             console.warn(`SimulateMove: Limite de profundidade (${maxMultiCaptureDepth}) de multi-captura atingido.`);
         }
    }
    // Retorna a cópia do tabuleiro com o estado após o movimento (e multi-capturas, se houver)
    return boardCopy;
}


// --- Algoritmo Minimax com Poda Alpha-Beta ---

/**
 * Função principal do algoritmo Minimax com poda Alpha-Beta.
 * Explora recursivamente as possibilidades de jogo para encontrar o melhor movimento.
 *
 * @param {Array<Array<object|null>>} currentBoard - O estado atual do tabuleiro na simulação.
 * @param {number} depth - A profundidade restante de busca.
 * @param {boolean} isMaximizingPlayer - True se for a vez do jogador MAX (Máquina), False se for do jogador MIN (Humano).
 * @param {number} alpha - O melhor valor encontrado até agora para o jogador MAX (inicialmente -Infinity).
 * @param {number} beta - O melhor valor encontrado até agora para o jogador MIN (inicialmente +Infinity).
 * @returns {object} Um objeto contendo o melhor 'score' e o 'moveData' correspondente.
 *                   moveData: { row, col, capturedPiece?, fromRow, fromCol }
 */
function minimax(currentBoard, depth, isMaximizingPlayer, alpha, beta) {
    // --- Condição de Parada (Base da Recursão) ---
    // 1. Verifica se o jogo terminou neste estado simulado (vitória, derrota, empate por falta de movimentos)
    const isTerminal = checkGameEndSimulated(currentBoard);
    // 2. Para se atingiu a profundidade máxima de busca OU se é um nó terminal
    if (depth === 0 || isTerminal) {
        // Avalia o tabuleiro final/folha
        let score = evaluateBoard(currentBoard);
        // Adiciona um grande bônus/penalidade se for um estado de vitória/derrota
        // Isso garante que a IA priorize vitórias e evite derrotas iminentes.
        if(isTerminal) {
             const winner = getWinnerSimulated(currentBoard); // null, true (player), false (machine)
             if(winner === false) score += 1000; // Máquina vence (ótimo para Maximizador)
             else if(winner === true) score -= 1000; // Jogador vence (péssimo para Maximizador)
             // Empate (sem movimentos para ambos ou outro caso raro) não tem bônus/penalidade extra aqui
             // A avaliação posicional/material normal ainda se aplica.
        }
        // Retorna o score final para este nó folha, sem um movimento associado (pois é o fim da linha)
        return { score: score, moveData: null };
    }

    // --- Recursão ---
    let bestMoveData = null; // Guarda o MELHOR movimento encontrado neste nível
    // Determina para qual jogador estamos calculando os movimentos neste nível da árvore
    // Se isMaximizingPlayer é true (Máquina), então calculamos movimentos para player 'false'.
    // Se isMaximizingPlayer é false (Humano), então calculamos movimentos para player 'true'.
    const movesForPlayer = !isMaximizingPlayer; // false para máquina, true para humano

    // --- Coleta todos os movimentos possíveis para o jogador atual ---
    let allPossibleMoves = [];
    // Prioriza capturas obrigatórias
    const mandatoryCaptures = getAllMandatoryCaptures(movesForPlayer, currentBoard);
    if (mandatoryCaptures.length > 0) {
        allPossibleMoves = mandatoryCaptures; // Se há capturas, SÓ elas são consideradas
    } else {
        // Se não há capturas, busca todos os movimentos normais
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.player === movesForPlayer) {
                    // Usa getNormalMovesForPiece aqui, pois já sabemos que não há capturas obrigatórias
                    const normalMoves = getNormalMovesForPiece(r, c, currentBoard);
                    normalMoves.forEach(move => {
                        // Adiciona o movimento normal junto com a origem
                        allPossibleMoves.push({ ...move, fromRow: r, fromCol: c });
                    });
                }
            }
        }
    }

     // Se, mesmo após verificar capturas e normais, não há movimentos
     // (pode acontecer em estados de bloqueio não detectados por checkGameEndSimulated ou erro)
     if (allPossibleMoves.length === 0) {
        // Isso é essencialmente um nó terminal (empate/derrota por falta de movimento)
        // Retorna a avaliação do estado atual, pois não há jogadas a fazer.
        // console.warn(`Minimax: Nenhum movimento encontrado na profundidade ${depth} para jogador ${movesForPlayer}, tratando como terminal.`);
        return { score: evaluateBoard(currentBoard), moveData: null };
    }

    // --- Lógica Maximizadora (Máquina) ---
    if (isMaximizingPlayer) {
        let maxEval = -Infinity; // Inicia com o pior score possível para o maximizador
        // Itera por cada movimento possível
        for (const moveData of allPossibleMoves) {
            // Simula o movimento para obter o estado do tabuleiro resultante
            const boardAfterMove = simulateMove(moveData.fromRow, moveData.fromCol, moveData, currentBoard);
            // Chama recursivamente o minimax para o próximo nível (jogador Minimizador)
            const evaluation = minimax(boardAfterMove, depth - 1, false, alpha, beta);
            // Compara o score retornado pela chamada recursiva com o melhor score encontrado até agora (maxEval)
            if (evaluation.score > maxEval) {
                maxEval = evaluation.score; // Atualiza o melhor score
                bestMoveData = moveData;   // Guarda o movimento que levou a esse score
            }
            // Poda Alpha-Beta: Atualiza Alpha (o melhor que o Maximizador pode garantir)
            alpha = Math.max(alpha, evaluation.score);
            // Se Beta (o melhor que o Minimizador pode garantir) for menor ou igual a Alpha,
            // o Minimizador já tem uma opção melhor em outro ramo da árvore, então podemos podar este ramo.
            if (beta <= alpha) {
                break; // Poda Beta
            }
        }
        // Retorna o melhor score encontrado (maxEval) e o movimento associado (bestMoveData)
        return { score: maxEval, moveData: bestMoveData };
    }
    // --- Lógica Minimizadora (Jogador Humano Simulado) ---
    else {
        let minEval = Infinity; // Inicia com o pior score possível para o minimizador
        // Itera por cada movimento possível
        for (const moveData of allPossibleMoves) {
            // Simula o movimento
            const boardAfterMove = simulateMove(moveData.fromRow, moveData.fromCol, moveData, currentBoard);
            // Chama recursivamente o minimax para o próximo nível (jogador Maximizador)
            const evaluation = minimax(boardAfterMove, depth - 1, true, alpha, beta);
            // Compara o score retornado com o melhor score encontrado até agora (minEval)
            if (evaluation.score < minEval) {
                minEval = evaluation.score; // Atualiza o melhor score (menor é melhor para o minimizador)
                bestMoveData = moveData;   // Guarda o movimento
            }
            // Poda Alpha-Beta: Atualiza Beta (o melhor que o Minimizador pode garantir)
            beta = Math.min(beta, evaluation.score);
            // Se Beta for menor ou igual a Alpha, o Maximizador já tem uma opção melhor em outro ramo, poda este.
            if (beta <= alpha) {
                break; // Poda Alpha
            }
        }
         // Retorna o melhor score encontrado (minEval) e o movimento associado (bestMoveData)
        return { score: minEval, moveData: bestMoveData };
    }
}

// --- Funções Auxiliares para Simulação ---

/** Verifica fim de jogo em um tabuleiro simulado (usado pelo Minimax). */
function checkGameEndSimulated(simBoard) {
    const playerPieces = countPiecesSimulated(true, simBoard);
    const machinePieces = countPiecesSimulated(false, simBoard);
    // Condição 1: Um dos jogadores ficou sem peças
    if (playerPieces === 0 || machinePieces === 0) return true;

    // Condição 2: Verifica se ALGUM dos jogadores não tem mais movimentos possíveis
    const playerMovesPossible = hasPossibleMoveSimulated(true, simBoard);
    const machineMovesPossible = hasPossibleMoveSimulated(false, simBoard);
    // O jogo termina se o jogador da vez OU o oponente não puderem se mover
    // (Considera empate por bloqueio mútuo ou vitória/derrota por falta de movimento)
    return !playerMovesPossible || !machineMovesPossible;
}

/** Determina o vencedor em um tabuleiro simulado que JÁ É considerado terminal. */
function getWinnerSimulated(simBoard) {
     const playerPieces = countPiecesSimulated(true, simBoard);
     const machinePieces = countPiecesSimulated(false, simBoard);
     const playerMovesPossible = hasPossibleMoveSimulated(true, simBoard);
     const machineMovesPossible = hasPossibleMoveSimulated(false, simBoard);

     // Máquina vence se jogador não tem peças OU não tem movimentos
     if(playerPieces === 0 || !playerMovesPossible) return false; // false = máquina vence
     // Jogador vence se máquina não tem peças OU não tem movimentos
     if(machinePieces === 0 || !machineMovesPossible) return true; // true = jogador vence

     // Se chegou aqui e é terminal, pode ser um empate raro (não coberto pelas regras?)
     // ou um estado onde ambos estão bloqueados. Retornar null indica empate/indeterminado.
     return null;
}

/** Conta peças de um jogador em um tabuleiro simulado. */
function countPiecesSimulated(isPlayer, simBoard) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            // Verifica se a peça existe e pertence ao jogador especificado
            if (simBoard[row]?.[col]?.player === isPlayer) {
                count++;
            }
        }
    }
    return count;
}

/** Verifica se um jogador tem QUALQUER movimento possível (captura ou normal) em um tabuleiro simulado. */
function hasPossibleMoveSimulated(isPlayer, simBoard) {
    // 1. Verifica se há capturas obrigatórias (mais rápido que checar tudo)
    if (getAllMandatoryCaptures(isPlayer, simBoard).length > 0) return true;

    // 2. Se não há capturas, verifica movimentos normais
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = simBoard[r]?.[c];
            if (piece && piece.player === isPlayer) {
                // Verifica se esta peça tem algum movimento normal
                if (getNormalMovesForPiece(r, c, simBoard).length > 0) {
                    return true; // Encontrou pelo menos um movimento normal
                }
            }
        }
    }
    // Se percorreu tudo e não encontrou nem captura nem movimento normal
    return false;
}

// --- Turno da Máquina ---

/** Controla a lógica e execução do turno da máquina (IA). */
function machineTurn() {
    console.log("--- machineTurn INICIO ---");
    // Garante que o estado 'pensando' está ativo e atualiza a UI
    isMachineThinking = true;
    drawBoard();

    // Primeira verificação: O jogo já terminou antes da máquina começar a pensar?
    if (checkGameEnd()) {
        console.log("machineTurn: Jogo terminou antes da máquina jogar.");
        isMachineThinking = false; // Libera o estado
        drawBoard(); // Remove o overlay "pensando"
        return; // Encerra a função
    }

    let bestMoveResult = null; // Armazenará o resultado da IA ({ score, moveData })
    // Mapeia a dificuldade selecionada para a profundidade da busca Minimax
    const depthMap = { easy: 1, medium: 3, hard: 5 }; // Ajustado 'hard' para performance
    const minimaxDepth = depthMap[difficultyLevel] || 3; // Usa 3 como padrão se algo der errado

    // Adiciona um bloco try...catch para capturar erros inesperados na lógica da IA
    try {
        // --- Lógica de Escolha de Movimento ---
        if (difficultyLevel === 'easy') {
            // Nível Fácil: Escolhe um movimento aleatório, priorizando capturas.
            console.log("Máquina (Fácil): Procurando movimentos...");
            const mandatoryCaptures = getAllMandatoryCaptures(false, board); // Capturas para a máquina (player: false)
            let possibleMachineMoves = [];

            if (mandatoryCaptures.length > 0) {
                // Se há capturas, considera apenas elas
                possibleMachineMoves = mandatoryCaptures;
                console.log(`Máquina (Fácil): Encontradas ${possibleMachineMoves.length} capturas obrigatórias.`);
            } else {
                // Se não há capturas, busca movimentos normais
                for (let r = 0; r < boardSize; r++) {
                    for (let c = 0; c < boardSize; c++) {
                        if (board[r]?.[c]?.player === false) { // Peça da máquina
                            const normalMoves = getNormalMovesForPiece(r, c, board);
                            normalMoves.forEach(move => {
                                possibleMachineMoves.push({ ...move, fromRow: r, fromCol: c });
                            });
                        }
                    }
                }
                console.log(`Máquina (Fácil): Encontrados ${possibleMachineMoves.length} movimentos normais.`);
            }

            // Escolhe aleatoriamente um dos movimentos possíveis encontrados
            if (possibleMachineMoves.length > 0) {
                const randomIndex = Math.floor(Math.random() * possibleMachineMoves.length);
                // Guarda o movimento escolhido no formato esperado
                bestMoveResult = { moveData: possibleMachineMoves[randomIndex], score: 0 }; // Score não é relevante aqui
                console.log(`Máquina (Fácil): Escolheu o movimento aleatório:`, bestMoveResult.moveData);
            } else {
                 // Se não encontrou NENHUM movimento (nem captura, nem normal)
                 console.log("Máquina (Fácil): Sem movimentos possíveis!");
                 // Isso significa que o jogo deveria ter terminado. Chama endGame para garantir.
                 // Se a máquina não tem movimentos, o jogador vence.
                 endGame(true); // Jogador vence
                 isMachineThinking = false; // Libera estado
                 drawBoard(); // Atualiza UI final
                 return; // Encerra
            }

        } else {
            // Nível Médio/Difícil: Usa Minimax
            console.log(`Máquina (${difficultyLevel}): Calculando Minimax (profundidade ${minimaxDepth})...`);
            const startTime = performance.now();
            // Chama o minimax. A máquina é o jogador Maximizador (true).
            bestMoveResult = minimax(board, minimaxDepth, true, -Infinity, Infinity);
            const endTime = performance.now();
            console.log(`Minimax ${bestMoveResult?.moveData ? 'concluído' : 'falhou em encontrar movimento'} em ${(endTime - startTime).toFixed(2)} ms. Melhor Score: ${bestMoveResult?.score?.toFixed(2)}`);

             // Validação: Verifica se o minimax realmente retornou um movimento
            if (!bestMoveResult || !bestMoveResult.moveData) {
                console.warn("Minimax não retornou um movimento válido! Tentando fallback com lógica Fácil.");
                // Como fallback, tenta executar a lógica fácil UMA VEZ.
                // Guarda a dificuldade original para restaurar depois
                const originalDifficulty = difficultyLevel;
                difficultyLevel = 'easy'; // Muda temporariamente
                machineTurn();          // Chama a função novamente com a dificuldade fácil
                difficultyLevel = originalDifficulty; // Restaura a dificuldade original
                return; // Sai desta execução atual para evitar processamento duplicado
            }
             console.log("Melhor movimento encontrado pelo Minimax:", bestMoveResult.moveData);
        }

        // --- Execução do Movimento Escolhido ---
        if (bestMoveResult && bestMoveResult.moveData) {
            const moveData = bestMoveResult.moveData; // Objeto { row, col, capturedPiece?, fromRow, fromCol }

            // Extrai as informações necessárias do moveData
            const fromRow = moveData.fromRow;
            const fromCol = moveData.fromCol;
            // Cria o objeto 'move' no formato esperado pela função makeMove: { row, col, capturedPiece? }
            const move = {
                row: moveData.row,
                col: moveData.col,
                capturedPiece: moveData.capturedPiece // Será undefined se não for captura, o que é correto
            };

            // Log detalhado do movimento que será executado
            console.log(`Máquina executando: [${fromRow},${fromCol}] -> [${move.row},${move.col}]` +
                        (move.capturedPiece ? ` (Captura peça em: [${move.capturedPiece.row},${move.capturedPiece.col}])` : ''));

            // Validação CRUCIAL: A peça de origem ainda existe?
            // (Pode ter sido removida por um bug ou estado inconsistente)
            if (!board[fromRow]?.[fromCol]) {
                 console.error(`ERRO CRÍTICO: Peça da máquina em [${fromRow},${fromCol}] DESAPARECEU antes de mover! Abortando turno da máquina.`);
                 // Em vez de tentar corrigir, é mais seguro passar o turno para evitar loops/erros piores.
                 endMachineTurn(); // Passa o turno de volta para o jogador
                 return; // Encerra a execução do turno da máquina
            }

            // Executa o movimento no tabuleiro REAL (board)
            makeMove(fromRow, fromCol, move, board);

            // --- Verifica Multi-Captura da Máquina ---
            // Se o movimento que acabou de ser feito foi uma captura...
            if (move.capturedPiece) {
                 // Verifica se a peça que se moveu (agora em move.row, move.col)
                 // pode fazer MAIS capturas a partir de sua nova posição.
                 const pieceJustMoved = board[move.row]?.[move.col];
                 // Confirma que a peça movida ainda existe e é da máquina
                 if (pieceJustMoved && !pieceJustMoved.player) {
                     const moreMachineCaptures = getCaptureMovesForPiece(move.row, move.col, board);
                     if (moreMachineCaptures.length > 0) {
                         // --- Multi-captura encontrada! ---
                         console.log(`Máquina tem ${moreMachineCaptures.length} opção(ões) de captura múltipla! Jogando novamente...`);
                         // Não finaliza o turno da máquina ainda.
                         // Libera o estado de "pensando" brevemente para a UI atualizar
                         isMachineThinking = false;
                         drawBoard(); // Mostra o resultado da primeira captura
                         // Agenda a próxima chamada de machineTurn para continuar a sequência de captura
                         // Um pequeno delay para parecer mais natural
                         setTimeout(machineTurn, 400);
                         return; // Sai da função atual, a próxima chamada cuidará do resto do turno
                     }
                 }
            }
             // Se não houve multi-captura (ou a sequência terminou)
             console.log("Movimento da máquina concluído. Sem multi-captura adicional.");
             endMachineTurn(); // Finaliza o turno da máquina e passa para o jogador

        } else {
             // Caso MUITO inesperado: A IA (fácil ou minimax) deveria ter retornado um movimento, mas não retornou.
             console.error("Erro Inesperado: Lógica da IA falhou em fornecer um bestMoveResult válido, embora devesse haver movimentos.");
              // Como medida de segurança, verifica se REALMENTE não há movimentos.
             if (!hasPossibleMove(false, board)){ // Verifica movimentos para a máquina (false)
                 console.log("Confirmado: Máquina realmente não tem movimentos. Jogo deveria terminar.");
                 endGame(true); // Jogador vence
             } else {
                 // Se há movimentos, mas a IA falhou, passa o turno para evitar bloqueio total do jogo.
                 console.error("Há movimentos disponíveis, mas a IA não os selecionou. Passando o turno.");
                 endMachineTurn();
             }
        }

    } catch (error) {
         // Captura qualquer erro que ocorra dentro do bloco try
         console.error("!!! ERRO CRÍTICO DURANTE O TURNO DA MÁQUINA !!!", error);
         // Tenta se recuperar passando o turno, mas o estado do jogo pode estar inconsistente.
         endMachineTurn();
    } finally {
        // O estado isMachineThinking é gerenciado dentro da lógica:
        // - Setado como true no início de machineTurn.
        // - Setado como false em endMachineTurn.
        // - Setado como false temporariamente antes da chamada recursiva de multi-captura.
        // - Setado como false se o jogo terminar.
        // Portanto, um bloco finally aqui para resetar poderia ser redundante ou causar problemas
        // se a multi-captura estiver em andamento. A lógica atual parece cobrir os casos.
    }
}


/** Finaliza o turno da máquina, passa a vez para o jogador e verifica o fim de jogo. */
function endMachineTurn() {
    playerTurn = true;         // Passa a vez para o jogador
    isMachineThinking = false; // Libera o bloqueio de input
    console.log("Turno da máquina encerrado. Vez do Jogador.");
    drawBoard();               // Atualiza a interface sem o overlay "pensando"

    // Verifica se o jogo terminou APÓS o movimento da máquina
    // (Ex: jogador sem peças ou sem movimentos)
    checkGameEnd();
}


// --- Fim de Jogo e Utilitários ---

/**
 * Verifica as condições de fim de jogo no tabuleiro PRINCIPAL.
 * Se o jogo terminou, chama a função endGame.
 * @returns {boolean} True se o jogo terminou, False caso contrário.
 */
function checkGameEnd() {
    // Contagem de peças restantes para cada jogador
    const playerPieces = countPieces(true);
    const machinePieces = countPieces(false);

    // Verifica se algum jogador ficou sem peças
    if (machinePieces === 0) {
        console.log("Fim de Jogo: Máquina sem peças.");
        endGame(true); // Jogador vence
        return true;
    }
    if (playerPieces === 0) {
        console.log("Fim de Jogo: Jogador sem peças.");
        endGame(false); // Máquina vence
        return true;
    }

    // Verifica se o jogador ATUAL não tem movimentos possíveis
    // (Importante checar apenas para o jogador da vez para evitar fim prematuro)
    const currentPlayer = playerTurn; // Quem deveria jogar agora?
    const currentPlayerHasMoves = hasPossibleMove(currentPlayer, board);

    if (!currentPlayerHasMoves) {
        console.log(`Fim de Jogo: ${currentPlayer ? 'Jogador' : 'Máquina'} sem movimentos possíveis.`);
        // Se o jogador atual não tem movimentos, ele perde. O oponente vence.
        endGame(!currentPlayer); // Passa o oposto de currentPlayer para indicar o vencedor
        return true;
    }

    // Se nenhuma condição de fim de jogo foi atendida
    return false; // Jogo continua
}

/**
 * Verifica se um jogador tem QUALQUER movimento possível (captura ou normal)
 * no tabuleiro principal (board).
 * @param {boolean} isPlayer - True para verificar o jogador, False para a máquina.
 * @param {Array<Array<object|null>>} currentBoard - O tabuleiro a ser verificado.
 * @returns {boolean} True se houver pelo menos um movimento, False caso contrário.
 */
function hasPossibleMove(isPlayer, currentBoard) {
    // Otimização: Primeiro verifica se há capturas obrigatórias
    if (getAllMandatoryCaptures(isPlayer, currentBoard).length > 0) {
        return true; // Se tem captura, tem movimento
    }

    // Se não há capturas, itera pelas peças do jogador procurando movimentos normais
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const piece = currentBoard[r]?.[c];
            // Verifica se a peça existe e pertence ao jogador correto
            if (piece && piece.player === isPlayer) {
                // Verifica se esta peça tem algum movimento NORMAL
                if (getNormalMovesForPiece(r, c, currentBoard).length > 0) {
                    return true; // Encontrou um movimento normal, então há movimento possível
                }
            }
        }
    }

    // Se percorreu todas as peças e não encontrou nem captura nem movimento normal
    return false;
}

/** Conta as peças de um jogador no tabuleiro principal (board). */
function countPieces(isPlayer) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row]?.[col]?.player === isPlayer) {
                count++;
            }
        }
    }
    return count;
}

/** Processa o fim do jogo: exibe mensagem, atualiza placar e reinicia. */
function endGame(playerWon) {
    // Garante que a máquina não está mais marcada como "pensando"
    isMachineThinking = false;
    // Define a mensagem de resultado
    const resultMessage = playerWon ? "Você Venceu!" : "A Máquina Venceu!";
    console.log(`--- FIM DE JOGO! ${resultMessage} ---`);

    // Atualiza o placar interno
    if (playerWon) {
        playerWins++;
    } else {
        machineWins++;
    }
    // Atualiza a exibição do placar na interface
    updateScoreboardDisplay();

    // Usa setTimeout para exibir o alerta APÓS a última atualização do tabuleiro ser renderizada
    // e para não bloquear a execução imediatamente.
    setTimeout(() => {
        // Exibe o alerta com o resultado e o placar atualizado
        alert(`Fim de Jogo! ${resultMessage}\n\nPlacar: Você ${playerWins} x ${machineWins} Máquina\n\nClique OK para jogar novamente.`);
        // Reinicia o tabuleiro para um novo jogo
        initializeBoard();
    }, 200); // Pequeno delay antes do alerta
}

/** Atualiza os números exibidos no placar HTML. */
function updateScoreboardDisplay() {
    const playerScoreElement = document.getElementById('player-score');
    const machineScoreElement = document.getElementById('machine-score');
    if (playerScoreElement) playerScoreElement.textContent = playerWins;
    if (machineScoreElement) machineScoreElement.textContent = machineWins;
}

// --- Event Listeners ---

// Clique no canvas para interação do jogador
canvas.addEventListener('click', handleCanvasClick);

// Redimensionamento da janela para ajustar o tamanho do tabuleiro
window.addEventListener('resize', calculateSquareSize);

// Mudança na seleção de dificuldade
document.getElementById('difficulty-select').addEventListener('change', (event) => {
    difficultyLevel = event.target.value;
    console.log("--- Dificuldade alterada para:", difficultyLevel, "---");
    // Reseta o placar ao mudar a dificuldade
    playerWins = 0;
    machineWins = 0;
    updateScoreboardDisplay();
    // Reinicia o jogo com a nova dificuldade
    initializeBoard();
});

// Atualiza o ano no rodapé
const currentYearElement = document.getElementById('current-year');
if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
}


// --- Inicialização ---
// Garante que o DOM está pronto antes de inicializar (embora 'defer' ajude)
document.addEventListener('DOMContentLoaded', () => {
    initializeBoard();          // Configura o tabuleiro inicial
    updateScoreboardDisplay(); // Define o placar inicial (0x0)
    console.log("Jogo carregado e pronto. Sua vez!");
});