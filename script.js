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
    let compassChart = null;

    // Event Listeners
    startBtn.addEventListener('click', startQuiz);
    restartBtn.addEventListener('click', restartQuiz);

    function startQuiz() {
        startScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        if (compassChart) {
            compassChart.destroy(); // Destroy previous chart instance
        }
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

    // Compute convex hull (Graham scan algorithm simplified for 2D)
    function convexHull(points) {
        if (points.length < 3) return points;

        const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

        points.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

        const lower = [];
        for (let i = 0; i < points.length; i++) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
                lower.pop();
            }
            lower.push(points[i]);
        }

        const upper = [];
        for (let i = points.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
                upper.pop();
            }
            upper.push(points[i]);
        }

        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    // Draw the 4-quadrant compass chart with regions
    function drawCompassChart(userScores) {
        const ctx = compassChartCanvas.getContext('2d');

        // Group ideologies by clusters for region visualization
        const groups = {
            "좌파 / 진보": { color: "rgba(59, 130, 246, 0.2)", ideologies: [] },
            "우파 / 보수": { color: "rgba(239, 68, 68, 0.2)", ideologies: [] },
            "자유지상 / 아나키즘": { color: "rgba(34, 197, 94, 0.2)", ideologies: [] },
            "권위주의": { color: "rgba(168, 85, 247, 0.2)", ideologies: [] }
        };

        // Categorize ideologies into groups based on scores
        ideologies.forEach(ideology => {
            const s = ideology.scores;
            if (s.econ > 0 && s.scty > 0) groups["좌파 / 진보"].ideologies.push({ x: s.econ, y: s.stat, name: ideology.name });
            else if (s.econ < 0 && s.scty < 0) groups["우파 / 보수"].ideologies.push({ x: s.econ, y: s.stat, name: ideology.name });
            else if (s.stat < -50) groups["자유지상 / 아나키즘"].ideologies.push({ x: s.econ, y: s.stat, name: ideology.name });
            else groups["권위주의"].ideologies.push({ x: s.econ, y: s.stat, name: ideology.name });
        });

        const datasets = [];

        // Add regions for each group
        for (const [groupName, group] of Object.entries(groups)) {
            const hull = convexHull(group.ideologies);
            if (hull.length > 2) {
                datasets.push({
                    label: groupName,
                    data: hull,
                    backgroundColor: group.color,
                    borderColor: group.color.replace("0.2", "0.6"),
                    borderWidth: 1,
                    fill: true,
                    pointRadius: 0
                });
            }
        }

        // Add ideology points
        datasets.push({
            label: '이념 분포',
            data: ideologies.map(ideology => ({
                x: ideology.scores.econ,
                y: ideology.scores.stat,
                name: ideology.name
            })),
            backgroundColor: 'rgba(107, 114, 128, 0.7)',
            pointRadius: 6,
            pointHoverRadius: 8
        });

        // Add user point
        datasets.push({
            label: '나의 위치',
            data: [{ x: userScores.econ, y: userScores.stat }],
            backgroundColor: 'rgba(239, 68, 68, 1)',
            pointRadius: 9,
            pointHoverRadius: 11,
            borderColor: 'rgba(255, 255, 255, 0.9)',
            borderWidth: 2
        });

        compassChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        min: -100,
                        max: 100,
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '◀ 시장 (경제적 우파) · 평등 (경제적 좌파) ▶',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { zeroLineColor: 'rgba(0, 0, 0, 0.5)' }
                    },
                    y: {
                        min: -100,
                        max: 100,
                        title: {
                            display: true,
                            text: '◀ 자유 (자유지상주의) · 개입 (권위주의) ▶',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { zeroLineColor: 'rgba(0, 0, 0, 0.5)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const data = context.parsed;
                                if (context.datasetIndex === datasets.length - 2) { // Ideology dots
                                    return context.raw.name || '이념';
                                }
                                if (context.datasetIndex === datasets.length - 1) { // User dot
                                    return '나의 위치';
                                }
                                return context.dataset.label; // Region
                            }
                        }
                    }
                },
            }
        });
    }
});