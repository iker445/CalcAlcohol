document.addEventListener('DOMContentLoaded', () => {
    // State
    let drinks = [];
    
    // DOM Elements
    const drinkTypeSelect = document.getElementById('drink-type');
    const drinkQtyInput = document.getElementById('drink-qty');
    const addDrinkBtn = document.getElementById('add-drink-btn');
    const drinksListContainer = document.getElementById('drinks-list-container');
    const calcForm = document.getElementById('bac-form');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultBox = document.getElementById('result-box');
    const bacValueDisplay = document.getElementById('bac-value');
    const timeToSoberDisplay = document.getElementById('time-to-sober');
    const statusTextDisplay = document.getElementById('status-text');
    const warningsList = document.getElementById('warnings-list');

    // Constants for Drink Types (Volume in ml, ABV %)
    const drinkTypes = {
        beer: { name: 'Cerveza (330ml)', vol: 330, abv: 0.05 },
        wine: { name: 'Vino (150ml)', vol: 150, abv: 0.12 },
        spirit: { name: 'Licor/Chupito (45ml)', vol: 45, abv: 0.40 },
        cocktail: { name: 'Combinado (250ml)', vol: 250, abv: 0.07 } // Mixed drink approx
    };

    // Add Drink Event
    addDrinkBtn.addEventListener('click', () => {
        const typeKey = drinkTypeSelect.value;
        const qty = parseInt(drinkQtyInput.value);

        if (qty > 0) {
            addDrink(typeKey, qty);
        }
    });

    function addDrink(typeKey, qty) {
        const drinkData = drinkTypes[typeKey];
        drinks.push({ ...drinkData, qty });
        renderDrinks();
    }

    function renderDrinks() {
        drinksListContainer.innerHTML = '';
        drinks.forEach((drink, index) => {
            const div = document.createElement('div');
            div.className = 'drink-item';
            div.innerHTML = `
                <span>${drink.qty}x ${drink.name}</span>
                <button type="button" class="btn-icon" data-index="${index}" style="margin-left:auto; color:red; border:none; background:none; cursor:pointer;">✕</button>
            `;
            drinksListContainer.appendChild(div);
        });

        // Add delete listeners
        document.querySelectorAll('.drink-item button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                drinks.splice(idx, 1);
                renderDrinks();
            });
        });
    }

    // Calculate Event
    calculateBtn.addEventListener('click', () => {
        calculateBAC();
    });

    function calculateBAC() {
        const weight = parseFloat(document.getElementById('weight').value);
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const hours = parseFloat(document.getElementById('time').value);

        if (!weight || weight <= 0) {
            alert('Por favor, introduce un peso válido.');
            return;
        }

        // 1. Calculate Total Alcohol in Grams
        // Formula: Volume (ml) * ABV * 0.789 (Density of ethanol g/ml)
        let totalAlcoholGrams = 0;
        drinks.forEach(d => {
            totalAlcoholGrams += (d.vol * d.abv * 0.789) * d.qty;
        });

        // 2. Determine Widmark Constant (r)
        // Men: ~0.68, Women: ~0.55
        const r = gender === 'male' ? 0.68 : 0.55;

        // 3. Calculate Initial BAC (Widmark Formula)
        // BAC % = (Alcohol / (Weight * r)) * 100
        // Weight needs to be in grams for consistency if Alcohol is in grams? 
        // Actually Widmark is often stated as: A / (Wr). 
        // Usually: A (grams), W (kg). r (L/kg). Result is g/L (promille).
        // To get % (g/100ml), we divide by 10.
        
        // Let's stick to standard % calculation:
        // BAC = [Alcohol(g) / (BodyWeight(g) * r)] * 100
        // weight in kg * 1000 = grams
        let bac = (totalAlcoholGrams / (weight * 1000 * r)) * 100;

        // 4. Time Elimination
        // Average metabolization rate beta = 0.015% per hour
        const beta = 0.015;
        const elimination = beta * hours;

        let currentBac = bac - elimination;
        if (currentBac < 0) currentBac = 0;

        displayResults(currentBac);
    }

    function displayResults(bac) {
        resultBox.style.display = 'block';
        resultBox.className = 'result-box'; // reset classes
        
        // Format BAC to 3 or 4 decimals? Standard is usually 2 or 3.
        bacValueDisplay.textContent = bac.toFixed(3) + '%';

        let status = '';
        let warnings = [];
        let timeToZero = 0;

        // Calculate time to sober (0%)
        // currentBac / 0.015
        if (bac > 0) {
            timeToZero = bac / 0.015;
        }

        const hours = Math.floor(timeToZero);
        const minutes = Math.round((timeToZero - hours) * 60);
        
        if (timeToZero > 0) {
            timeToSoberDisplay.textContent = `Tiempo estimada para 0.00%: ${hours}h ${minutes}min`;
        } else {
            timeToSoberDisplay.textContent = 'Estás sobrio (estimado)';
        }

        // Determine Status
        if (bac < 0.02) {
            status = 'Sobrio / Efectos mínimos';
            resultBox.classList.add('safe');
        } else if (bac < 0.05) {
            status = 'Euforia leve / Relajación';
            warnings.push('Ligera pérdida de timidez.');
            warnings.push('La capacidad de conducción puede estar levemente afectada.');
            resultBox.classList.add('safe');
        } else if (bac < 0.08) {
            status = 'Alegría / Desinhibición';
            warnings.push('Reflejos disminuidos.');
            warnings.push('Menor razonamiento y percepción de profundidad.');
            warnings.push('LEGALMENTE NO APTO PARA CONDUCIR en muchos países.');
            resultBox.classList.add('warn');
        } else if (bac < 0.15) {
            status = 'Embriaguez / Torpeza motora';
            warnings.push('Reflejos y tiempos de reacción muy lentos.');
            warnings.push('Posible náusea y vómitos.');
            warnings.push('Peligro severo al volante.');
            resultBox.classList.add('danger');
        } else if (bac < 0.30) {
            status = 'Confusión / Estupor';
            warnings.push('Posible pérdida de consciencia.');
            warnings.push('Pérdida de comprensión.');
            resultBox.classList.add('danger');
        } else {
            status = 'Peligro grave / Coma etílico';
            warnings.push('POSIBILIDAD DE MUERTE.');
            warnings.push('Atención médica urgente necesaria.');
            resultBox.classList.add('danger');
        }

        statusTextDisplay.textContent = status;
        
        warningsList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
        
        // Scroll to result
        resultBox.scrollIntoView({ behavior: 'smooth' });
    }

    // FAQ Toggle
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.querySelector('.faq-question').addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
});
