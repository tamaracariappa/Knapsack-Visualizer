const baseColorPalette = ['#384B70', '#507687', '#DDA853', '#B8001F'];
let animationSpeed = 500;
let animationsPaused = false;
let currentAnimationTimeouts = [];
let currentCombinationIndex = 0;
let combinations = [];
let isSolving = false;
let weights = [];
let values = [];
let itemColors = [];
let bestValue = 0;
let bestChoice = [];

function generateColorVariations(baseColor, variationsNeeded) {
  const colors = [];
  const base = tinycolor(baseColor);
  for (let i = 0; i < variationsNeeded; i++) {
    let newColor = base.clone().lighten(10 + i * 3);
    if (newColor.getBrightness() > 200) newColor = newColor.darken(10);
    if (newColor.getBrightness() < 50) newColor = newColor.lighten(15);
    colors.push(newColor.toHexString());
  }
  return colors;
}

function getColorPalette(numItems) {
  if (numItems <= baseColorPalette.length) return baseColorPalette.slice(0, numItems);
  const colors = [...baseColorPalette];
  let extra = numItems - baseColorPalette.length;
  while (extra--) {
    const base = baseColorPalette[extra % baseColorPalette.length];
    colors.push(...generateColorVariations(base, 1));
  }
  return colors.slice(0, numItems);
}

function parseInput(input) {
  const parsed = input.split(',').map(x => x.trim()).filter(x => x !== '').map(Number);
  if (parsed.some(isNaN)) {
    alert("Please enter only numbers separated by commas");
    return [];
  }
  return parsed;
}

function setAnimationSpeed(speed) {
  animationSpeed = speed;
  updateSpeedDisplay();

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event) event.target.classList.add('active');
  document.getElementById('speedSlider').value = 2100 - speed;
}

function updateSpeedSlider() {
  const slider = document.getElementById('speedSlider');
  const invertedSpeed = 2100 - slider.value;
  animationSpeed = invertedSpeed;
  updateSpeedDisplay();

  document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));

  const presets = { 2000: "0.25x", 1000: "0.5x", 750: "0.75x", 500: "1x", 400: "1.25x", 333: "1.5x", 285: "1.75x", 250: "2x" };
  let closest = Object.keys(presets).reduce((a, b) => Math.abs(b - invertedSpeed) < Math.abs(a - invertedSpeed) ? b : a);
  if (Math.abs(closest - invertedSpeed) <= 50) {
    animationSpeed = parseInt(closest);
    slider.value = 2100 - closest;
    updateSpeedDisplay();
  }
}

function updateSpeedDisplay() {
  const speedValue = document.getElementById('speedValue');
  const ratio = 500 / animationSpeed;
  const displayMap = {
    0.25: "0.25x", 0.5: "0.5x", 0.75: "0.75x", 1: "1x",
    1.25: "1.25x", 1.5: "1.5x", 1.75: "1.75x", 2: "2x"
  };
  speedValue.textContent = displayMap[ratio] || ratio.toFixed(2) + "x";
}

function toggleAnimations() {
  animationsPaused = !animationsPaused;
  document.querySelector('.animation-toggle').textContent = animationsPaused ? 'Play' : 'Pause';
  if (!animationsPaused && isSolving) processNextCombination();
}

function processNextCombination() {
  if (animationsPaused || currentCombinationIndex >= combinations.length) return;

  const combo = combinations[currentCombinationIndex];
  
  // Update results table
  const row = document.createElement('li');
row.className = 'table-row';
row.style.animation = 'fadeInRow 0.3s ease-out';

  row.innerHTML = `
    <div>${combo.subset.length ? combo.subset.join(', ') : '∅'}</div>
    <div>${combo.weight}</div>
    <div>${combo.value}</div>
    <div>${combo.spaceLeft}</div>
    <div>${combo.feasible ? 'Feasible' : 'Not Feasible'}</div>
  `;
  
  if (JSON.stringify(combo.subset) === JSON.stringify(bestChoice)) {
    row.classList.add('optimal');
  }
  document.getElementById("resultTable").appendChild(row);

  // Update step visualization
  document.getElementById('stepNumber').textContent = currentCombinationIndex + 1;
  document.getElementById('currentItems').textContent = combo.subset.length ? combo.subset.join(', ') : 'None';
  document.getElementById('totalWeight').textContent = combo.weight;
  document.getElementById('totalValue').textContent = combo.value;
  
  const resultStatus = document.getElementById('resultStatus');
  resultStatus.textContent = combo.feasible ? 'Valid combination' : 'Exceeds weight limit';
  resultStatus.className = combo.feasible ? 'feasible' : '';
  
  document.getElementById('remainingSpace').textContent = combo.spaceLeft;
  if (combo.spaceLeft < 0) {
    document.getElementById('remainingSpace').style.color = '#d9534f';
  } else {
    document.getElementById('remainingSpace').style.color = '#5cb85c';
  }

  // Update knapsack visualization
  const knapsack = document.getElementById('knapsackContents');
  knapsack.innerHTML = '';
  combo.subset.forEach(i => {
    const item = document.createElement('div');
    item.className = 'item-visual';
    item.style.backgroundColor = itemColors[i - 1];
    item.textContent = `Item ${i}`;
    item.style.height = `${weights[i - 1] * 3}px`;
    knapsack.appendChild(item);
  });

  if (!combo.feasible) {
    knapsack.classList.add('flash');
    setTimeout(() => knapsack.classList.remove('flash'), 500);
  }

  currentCombinationIndex++;
  if (currentCombinationIndex < combinations.length) {
    const timeoutId = setTimeout(processNextCombination, animationSpeed);
    currentAnimationTimeouts.push(timeoutId);
  } else {const selectedItems = bestChoice.map(i => `
  <div class="pill-detailed" style="background-color: ${itemColors[i - 1]}">
    <span class="pill-title">Item ${i}</span>
    <span class="pill-meta">Weight: ${weights[i - 1]} | Value: ${values[i - 1]}</span>
  </div>
`).join('');


const totalWeight = bestChoice.reduce((sum, i) => sum + weights[i - 1], 0);
const remaining = parseInt(document.getElementById('capacityInput').value) - totalWeight;

const resultHTML = `
  <div class="final-results-box">
    <div class="final-results-left">
      <h3>Selected Items</h3>
      <div class="pill-container detailed">
  ${selectedItems || '<em>None</em>'}
</div>

    </div>
    <div class="final-results-right">
      <h3>Summary</h3>
      <p><span>Total Weight:</span> <strong>${totalWeight}</strong></p>
      <p><span>Total Value:</span> <strong>${bestValue}</strong></p>
      <p><span>Remaining Capacity:</span> <strong>${remaining}</strong></p>
    </div>
  </div>

  <div class="explanation-toggle-container">
    <button id="toggleExplanation" class="toggle-btn">Learn more</button>
    <div class="result-explanation hidden">
      <h4>How were these items selected?</h4>
      <ul>
        <li>The algorithm tested <strong>all possible combinations</strong> of items.</li>
        <li>It selected the combination that gave the <strong>highest total value</strong> without exceeding the weight limit.</li>
        <li>This ensures an <strong>optimal solution</strong> using brute-force evaluation.</li>
      </ul>
    </div>
  </div>
`;

document.getElementById("results").innerHTML = resultHTML;

document.getElementById('toggleExplanation').addEventListener('click', () => {
  const expl = document.querySelector('.result-explanation');
  expl.classList.toggle('hidden');
  const btn = document.getElementById('toggleExplanation');
  btn.textContent = expl.classList.contains('hidden') ? 'Learn more' : 'Hide explanation';
});

    isSolving = false;
  }
}

function solveKnapsack() {
    weights = parseInput(document.getElementById('weightsInput').value);
    values = parseInput(document.getElementById('valuesInput').value);
    const capacity = parseInt(document.getElementById('capacityInput').value);
  
    if (weights.length === 0 || values.length === 0 || isNaN(capacity)) {
      alert("Please enter valid weights, values, and capacity");
      return;
    }
  
    if (weights.length !== values.length) {
      alert("Number of weights must match number of values");
      return;
    }
  
    // Clear previous visualization
    document.getElementById('knapsackContents').innerHTML = '';
    document.getElementById('itemsList').innerHTML = '';
    document.getElementById('capacityDisplay').textContent = capacity;
    
    // Generate color palette for items
    itemColors = getColorPalette(weights.length);
    
    // Display items list with matching border colors
    weights.forEach((weight, index) => {
      const li = document.createElement('li');
      li.textContent = `Item ${index + 1} (W:${weight}, V:${values[index]})`;
      li.style.borderLeft = `4px solid ${itemColors[index]}`;
      document.getElementById('itemsList').appendChild(li);
    });


  // Update total steps display
  document.getElementById('totalSteps').textContent = Math.pow(2, weights.length);

  currentCombinationIndex = 0;
  combinations = [];
  bestValue = 0;
  bestChoice = [];
  currentAnimationTimeouts.forEach(clearTimeout);
  currentAnimationTimeouts = [];
  animationsPaused = false;
  isSolving = true;
  document.querySelector('.animation-toggle').textContent = 'Pause';

  itemColors = getColorPalette(weights.length);
  document.querySelector('.table-container').style.display = 'block';

  const table = document.getElementById("resultTable");
  table.innerHTML = `
    <li class="table-header">
      <div>Items</div>
      <div>Weight</div>
      <div>Value</div>
      <div>Space Left</div>
      <div>Feasible</div>
    </li>
  `;

  const n = weights.length;
  const total = 1 << n;
  
  for (let size = 0; size <= n; size++) {
    for (let mask = 0; mask < total; mask++) {
      const subset = [];
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) subset.push(j + 1);
      }
      if (subset.length === size) {
        let totalWeight = 0, totalValue = 0;
        subset.forEach(index => {
          totalWeight += weights[index - 1];
          totalValue += values[index - 1];
        });
        if (totalWeight <= capacity && totalValue > bestValue) {
          bestValue = totalValue;
          bestChoice = subset.slice();
        }
        combinations.push({
          subset,
          weight: totalWeight,
          value: totalValue,
          spaceLeft: capacity - totalWeight,
          feasible: totalWeight <= capacity
        });
      }
    }
  }

  processNextCombination();
}

function resetInputs() {
  currentAnimationTimeouts.forEach(clearTimeout);
  currentAnimationTimeouts = [];
  animationsPaused = false;
  isSolving = false;
  document.querySelector('.animation-toggle').textContent = 'Pause';

  document.getElementById('weightsInput').value = '';
  document.getElementById('valuesInput').value = '';
  document.getElementById('capacityInput').value = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('resultTable').innerHTML = `
    <li class="table-header">
      <div>Items</div>
      <div>Weight</div>
      <div>Value</div>
      <div>Space Left</div>
      <div>Feasible</div>
    </li>
  `;
  document.getElementById('knapsackContents').innerHTML = '';
  document.getElementById('capacityDisplay').textContent = '0';
  document.getElementById('itemsList').innerHTML = '';
  document.getElementById('stepNumber').textContent = '0';
  document.getElementById('totalSteps').textContent = '0';
  document.getElementById('currentItems').textContent = 'None';
  document.getElementById('totalWeight').textContent = '0';
  document.getElementById('totalValue').textContent = '0';
  document.getElementById('resultStatus').textContent = 'Waiting to start';
  document.getElementById('remainingSpace').textContent = '0';
  document.querySelector('.table-container').style.display = 'none';
}

function updateRectangle() {
  const maxWeight = parseInt(document.getElementById('capacityInput').value);
  if (!isNaN(maxWeight)) {
    document.getElementById('capacityDisplay').textContent = maxWeight;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  updateSpeedDisplay();
});