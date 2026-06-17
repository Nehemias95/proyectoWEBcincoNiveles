self.onmessage = function (e) {
    const { type, data } = e.data;

    if (type === 'level4') {
        processLevel4(data);
    } else if (type === 'level5') {
        processLevel5(data);
    }
};

function processLevel4(data) {
    const total = data.length;
    let sumTemp = 0, sumHum = 0;
    let maxTemp = -Infinity, maxHum = -Infinity;
    let minTemp = Infinity, minHum = Infinity;

    for (let i = 0; i < total; i++) {
        const d = data[i];
        sumTemp += d.temperature;
        sumHum += d.humidity;
        if (d.temperature > maxTemp) maxTemp = d.temperature;
        if (d.humidity > maxHum) maxHum = d.humidity;
        if (d.temperature < minTemp) minTemp = d.temperature;
        if (d.humidity < minHum) minHum = d.humidity;

        if (i % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                progress: Math.round((i / total) * 100)
            });
        }
    }

    self.postMessage({
        type: 'result',
        stats: {
            avgTemp: (sumTemp / total).toFixed(2),
            avgHum: (sumHum / total).toFixed(2),
            maxTemp: maxTemp.toFixed(2),
            maxHum: maxHum.toFixed(2),
            minTemp: minTemp.toFixed(2),
            minHum: minHum.toFixed(2)
        }
    });
}

function processLevel5(data) {
    const total = data.length;
    let sumTemp = 0, sumHum = 0, sumPres = 0;
    let validCount = 0;
    let validTemps = [];
    let validPressures = [];

    for (let i = 0; i < total; i++) {
        const d = data[i];

        if (i % 2000 === 0) {
            self.postMessage({
                type: 'progress',
                progress: Math.round((i / total) * 100)
            });
        }

        if (d.temperature >= 0 && d.humidity >= 0 && d.pressure >= 0) {
            sumTemp += d.temperature;
            sumHum += d.humidity;
            sumPres += d.pressure;
            validCount++;
            validTemps.push({ val: d.temperature, idx: i });
            validPressures.push({ val: d.pressure, idx: i });
        }
    }

    validTemps.sort((a, b) => b.val - a.val);
    validPressures.sort((a, b) => b.val - a.val);

    const top10Temps = validTemps.slice(0, 10).map(t => t.val.toFixed(2));
    const top10Press = validPressures.slice(0, 10).map(p => p.val.toFixed(2));

    const stats = {
        avgTemp: (sumTemp / validCount).toFixed(2),
        avgHum: (sumHum / validCount).toFixed(2),
        avgPres: (sumPres / validCount).toFixed(2),
        top10Temps,
        top10Press,
        validCount
    };

    self.postMessage({
        type: 'result',
        stats
    });
}
