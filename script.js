document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const questionNumberEl = document.getElementById('question-number');
    const progressBar = document.getElementById('progress-bar');
    const questionTextEl = document.getElementById('question-text');
    const answerButtons = document.querySelectorAll('.answer-btn');
    const compassChartCanvas = document.getElementById('compass-chart');

    // State variables
    let currentQuestionIndex = 0;
    let scores = { econ: 0, stat: 0, scty: 0, dipl: 0 };
    const maxScores = { econ: 0, stat: 0, scty: 0, dipl: 0 };

    // Event Listeners
    startBtn.addEventListener('click', startQuiz);
    restartBtn.addEventListener('click', restartQuiz);

    function startQuiz() {
        startScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        calculateMaxScores();
        showQuestion();
    }
    
    function restartQuiz() {
        resultScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        currentQuestionIndex = 0;
        scores = { econ: 0, stat: 0, scty: 0, dipl: 0 };
        progressBar.style.width = '0%';
    }

    // Calculate max possible score for normalization
    function calculateMaxScores() {
        // Reset maxScores
        for (const axis in maxScores) {
            maxScores[axis] = 0;
        }
        questions.forEach(q => {
            for (const axis in q.effects) {
                // The max multiplier is 2 (from "강력히 동의/반대")
                maxScores[axis] += Math.abs(q.effects[axis] * 2);
            }
        });
    }

    // Display current question
    function showQuestion() {
        const question = questions[currentQuestionIndex];
        questionTextEl.textContent = question.text;
        questionNumberEl.textContent = `질문 ${currentQuestionIndex + 1} / ${questions.length}`;
        progressBar.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;
    }

    // Handle answer button clicks
    answerButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const value = parseInt(e.target.dataset.value);
            const question = questions[currentQuestionIndex];

            for (const axis in question.effects) {
                scores[axis] += value * question.effects[axis];
            }

            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                showQuestion();
            } else {
                progressBar.style.width = '100%';
                showResults();
            }
        });
    });

    // Calculate and display results
    function showResults() {
        quizScreen.classList.add('hidden');
        
        // Normalize scores to a -100 to 100 scale
        for (const axis in scores) {
            if (maxScores[axis] !== 0) {
                scores[axis] = (scores[axis] / maxScores[axis]) * 100;
            }
        }

        const resultIdeology = findClosestIdeology();
        
        displayResultsContent(resultIdeology);
        drawCompassChart(scores); // Draw the new chart
        resultScreen.classList.remove('hidden');
    }

    // Find the closest ideology using Euclidean distance
    function findClosestIdeology() {
        return ideologies.reduce((closest, ideology) => {
            const dist = Math.hypot(
                scores.econ - ideology.scores.econ,
                scores.stat - ideology.scores.stat,
                scores.scty - ideology.scores.scty,
                scores.dipl - ideology.scores.dipl
            );
            return dist < closest.minDistance ? { ideology, minDistance: dist } : closest;
        }, { ideology: null, minDistance: Infinity }).ideology;
    }

    // Fill result content into the DOM
    function displayResultsContent(result) {
        document.getElementById('result-title').textContent = result.name;
        document.getElementById('result-description').textContent = result.description;
        
        const createList = (items) => items.map(item => `<li>${item}</li>`).join('');

        document.getElementById('result-figures').innerHTML = createList(result.figures);
        document.getElementById('result-readings').innerHTML = createList(result.readings);
        document.getElementById('result-media').innerHTML = createList(result.media);
        document.getElementById('result-communities').innerHTML = createList(result.communities);
        
        updateResultBar('econ-bar', scores.econ);
        updateResultBar('stat-bar', scores.stat);
        updateResultBar('scty-bar', scores.scty);
        updateResultBar('dipl-bar', scores.dipl);
    }

    // Update the visual result bars
    function updateResultBar(barId, score) {
        const bar = document.getElementById(barId);
        const percentage = 50 + (score / 2);
        
        let gradient = '';
        if (barId === 'econ-bar') gradient = 'linear-gradient(to right, #3b82f6, #ef4444)';
        if (barId === 'stat-bar') gradient = 'linear-gradient(to right, #22c55e, #eab308)';
        if (barId === 'scty-bar') gradient = 'linear-gradient(to right, #8b5cf6, #f97316)';
        if (barId === 'dipl-bar') gradient = 'linear-gradient(to right, #06b6d4, #ec4899)';

        bar.style.background = gradient;
        bar.style.setProperty('--target-width', `${percentage}%`);
        bar.style.width = `${percentage}%`;
    }

    // Generate color for each ideology based on political position
    function getIdeologyColor(ideology) {
        const econ = ideology.scores.econ;
        const stat = ideology.scores.stat;
        const scty = ideology.scores.scty;

        // Determine color based on quadrant and characteristics
        let hue, saturation = 65, lightness = 65;

        if (econ > 30) {
            // Left (economic equality)
            if (stat > 30) {
                hue = 340; // Auth-left: Red-pink
            } else if (stat < -30) {
                hue = 150; // Lib-left: Green
            } else {
                hue = 210; // Center-left: Blue
            }
        } else if (econ < -30) {
            // Right (economic market)
            if (stat > 30) {
                hue = 270; // Auth-right: Purple
            } else if (stat < -30) {
                hue = 45; // Lib-right: Gold
            } else {
                hue = 20; // Center-right: Orange
            }
        } else {
            // Center
            if (stat > 30) {
                hue = 300; // Auth-center: Violet
            } else if (stat < -30) {
                hue = 120; // Lib-center: Light green
            } else {
                hue = 0; // True center: Gray
                saturation = 20;
            }
        }

        return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
    }

    // Draw the political compass with Voronoi regions
    function drawCompassChart(userScores) {
        console.log('drawCompassChart called with scores:', userScores);

        const canvas = compassChartCanvas;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, 600);
        canvas.width = size;
        canvas.height = size;

        console.log('Canvas size:', size);

        const padding = 60;
        const chartWidth = size - padding * 2;
        const chartHeight = size - padding * 2;

        // Helper function to convert political coordinates to canvas coordinates
        function toCanvasX(politicalX) {
            return padding + ((politicalX + 100) / 200) * chartWidth;
        }

        function toCanvasY(politicalY) {
            return padding + ((100 - politicalY) / 200) * chartHeight;
        }

        // Check if d3 is loaded
        if (typeof d3 === 'undefined') {
            console.error('d3-delaunay library not loaded!');
            // Draw error message on canvas
            ctx.fillStyle = '#000';
            ctx.font = '16px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('라이브러리 로딩 오류', size / 2, size / 2);
            return;
        }

        // Prepare points for Voronoi
        const points = ideologies.map(ideology => [
            ideology.scores.econ,
            ideology.scores.stat
        ]);

        console.log('Points prepared:', points.length);

        try {
            // Create Voronoi diagram using d3-delaunay
            const delaunay = d3.Delaunay.from(points);
            const voronoi = delaunay.voronoi([-100, -100, 100, 100]);
            console.log('Voronoi diagram created successfully');

            // Clear canvas
            ctx.clearRect(0, 0, size, size);

            // Draw Voronoi cells
            ideologies.forEach((ideology, i) => {
                const cell = voronoi.cellPolygon(i);
                if (!cell) return;

                ctx.fillStyle = getIdeologyColor(ideology);
                ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                cell.forEach((point, j) => {
                    const x = toCanvasX(point[0]);
                    const y = toCanvasY(point[1]);
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // Draw axis lines
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 2;

            // Vertical axis (x=0)
            ctx.beginPath();
            ctx.moveTo(toCanvasX(0), toCanvasY(-100));
            ctx.lineTo(toCanvasX(0), toCanvasY(100));
            ctx.stroke();

            // Horizontal axis (y=0)
            ctx.beginPath();
            ctx.moveTo(toCanvasX(-100), toCanvasY(0));
            ctx.lineTo(toCanvasX(100), toCanvasY(0));
            ctx.stroke();

            // Draw axis labels
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';

            // X-axis labels
            ctx.fillText('평등 (경제적 좌파)', toCanvasX(70), toCanvasY(-100) - 10);
            ctx.fillText('시장 (경제적 우파)', toCanvasX(-70), toCanvasY(-100) - 10);

            // Y-axis labels
            ctx.save();
            ctx.translate(toCanvasX(-100) - 30, toCanvasY(60));
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('개입 (권위주의)', 0, 0);
            ctx.restore();

            ctx.save();
            ctx.translate(toCanvasX(-100) - 30, toCanvasY(-60));
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('자유 (자유지상주의)', 0, 0);
            ctx.restore();

            // Highlight user's ideology region
            const userIdeologyIndex = ideologies.findIndex(ideology => {
                return Math.hypot(
                    userScores.econ - ideology.scores.econ,
                    userScores.stat - ideology.scores.stat
                ) === Math.min(...ideologies.map(ide =>
                    Math.hypot(
                        userScores.econ - ide.scores.econ,
                        userScores.stat - ide.scores.stat
                    )
                ));
            });

            if (userIdeologyIndex >= 0) {
                const cell = voronoi.cellPolygon(userIdeologyIndex);
                if (cell) {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                    ctx.lineWidth = 3;

                    ctx.beginPath();
                    cell.forEach((point, j) => {
                        const x = toCanvasX(point[0]);
                        const y = toCanvasY(point[1]);
                        if (j === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }

            // Draw ideology points and labels
            ideologies.forEach((ideology, i) => {
                const x = toCanvasX(ideology.scores.econ);
                const y = toCanvasY(ideology.scores.stat);

                // Draw point
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();

                // Draw label with truncated name
                const nameLines = ideology.name.split('/').map(line => line.trim());
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = '9px "Noto Sans KR", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Draw text with background for readability
                nameLines.forEach((line, lineIndex) => {
                    const lineY = y + 8 + lineIndex * 10;
                    const metrics = ctx.measureText(line);

                    // Semi-transparent background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(
                        x - metrics.width / 2 - 2,
                        lineY - 6,
                        metrics.width + 4,
                        10
                    );

                    // Text
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                    ctx.fillText(line, x, lineY);
                });
            });

            // Draw user point
            const userX = toCanvasX(userScores.econ);
            const userY = toCanvasY(userScores.stat);

            ctx.fillStyle = 'rgba(239, 68, 68, 1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(userX, userY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw user label
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('나의 위치', userX, userY - 15);

        } catch (error) {
            console.error('Error drawing Voronoi chart:', error);
            // Draw fallback error message
            ctx.fillStyle = '#000';
            ctx.font = '16px "Noto Sans KR", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('차트 렌더링 오류', size / 2, size / 2);
            ctx.font = '12px "Noto Sans KR", sans-serif';
            ctx.fillText('브라우저 콘솔을 확인하세요', size / 2, size / 2 + 25);
        }
    }
});