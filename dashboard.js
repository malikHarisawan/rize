let selectedDate = new Date();


let isDrilldown = false
const categoryColors = {
  "Software Development": "#00d8ff",
  "Reference & Learning": "#b381c9",
  "Communication": "#5ac26d",
  "Miscellaneous": "#7a7a7a",
  "Entertainment": "#ff6384",
  "Utilities": "#ffce56"
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; 
}


function navigateDate(days) {
  selectedDate.setDate(selectedDate.getDate() + days);
  document.querySelector('.calendar').value = formatDate(selectedDate);
  updateWindowInfo();
}

let productivityChart;
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};


function generateDatasets(categoriesData) { 
  const colorsPalette = ['#ff6384', '#36a2eb', '#ffce56', '#99ccff', '#66b3ff', '#ffc107', '#ff9999', '#ffd700', '#ffecb3'];

  const datasets = {
    initial: {
      labels: Object.keys(categoriesData),
      data: Object.keys(categoriesData).map(cat =>
        Math.floor(categoriesData[cat].reduce((sum, entry) => sum + entry.time, 0) / 60000)
      ),
      colors: Object.keys(categoriesData).map(cat => categoryColors[cat] || "#000000")
    }
  };

  for (const [category, entries] of Object.entries(categoriesData)) {

    const filterdApps = entries.filter(ent => ent.time > 2 * 6000)
    datasets[category] = {
      labels: filterdApps.map(ent => ent.app),
      data: filterdApps.map(ent => Math.floor(ent.time / 60000)),
      colors: filterdApps.map((_, index) => colorsPalette[index % colorsPalette.length])

    }

  }

  return datasets;
}

function drawNoDataMessage(ctx) {
  
  if (productivityChart) {
    productivityChart.destroy();
    productivityChart = null;
  }
  

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px Arial';
  ctx.fillStyle = '#999';
  ctx.fillText('No data available for this date', 
    ctx.canvas.width / 2, 
    ctx.canvas.height/ 2);
}
function filterCategoriesByTime(data) {
  const filteredData = {};

  for (const [category, entries] of Object.entries(data)) {
    const totalTime = entries.reduce((sum, entry) => sum + entry.time, 0);

    if (totalTime > 2 * 60000) {
      filteredData[category] = entries;
    }
  }

  return filteredData;
}
async function updateWindowInfo() {

  try {

    const formattedDate = formatDate(selectedDate);
    const categoriesData = await window.activeWindow.getCategoryAppsData(formattedDate);
   
    const info = await window.activeWindow.getFormattedStats(formattedDate);
    const ctx = document.getElementById('productivityChart').getContext('2d');
    const workHoursElement = document.getElementById("workHours");
    const breakdownContainer = document.querySelector(".dots-info");
    
    
    if (!categoriesData || !info) {
      workHoursElement.textContent = formatTime(0);
      breakdownContainer.innerHTML = "";
      drawNoDataMessage(ctx);
      return;
    }

    
    let data = filterCategoriesByTime(categoriesData)
    let chartDatasets = generateDatasets(data);
    
    console.log("categoriesData === ", chartDatasets)
    const totalMilliseconds = Object.values(info).reduce((a, b) => a + b, 0);
    const totalMinutes = Math.floor(totalMilliseconds / 60000);


    workHoursElement.textContent = formatTime(totalMinutes);

    breakdownContainer.innerHTML = "";

    Object.keys(info).forEach((category, index) => {
      const minutes = Math.floor((info[category] || 0) / 60000);
      if (minutes > 0 && chartDatasets.initial.labels.includes(category)) {
        const li = document.createElement("li");
        const dotColor = categoryColors[category] || "#000000";

        const dot = document.createElement("span");
        dot.classList.add("dot");
        dot.style.backgroundColor = dotColor;

        li.appendChild(dot);

        const categoryText = document.createElement("span");
        categoryText.textContent = `${category}: ${formatTime(minutes)}`;
        li.appendChild(categoryText);


        li.onclick = () => {
          if (chartDatasets[category]) {
            updateChartData(chartDatasets[category]);
          } else {
            console.error(`No data found for category: ${category}`);
          }
        };
        breakdownContainer.appendChild(li);
      }
    });
    const resetLi = document.createElement("button");
    resetLi.classList.add("resetLi");
    resetLi.textContent = "Reset";
    resetLi.onclick = () => {
      updateChartData(chartDatasets.initial);
    };
    breakdownContainer.appendChild(resetLi);

    if (productivityChart) {
      productivityChart.destroy(); 
    }
    isDrilldown = false,
      productivityChart = new Chart(ctx, {

        type: 'doughnut',
        data: {
          labels: chartDatasets.initial.labels,
          datasets: [{
            data: chartDatasets.initial.data,
            backgroundColor: chartDatasets.initial.colors
          }]
        },
        options: {
          responsive: true,
         
          plugins: {
            legend: {
              display: false,
              
            },
            tooltip: {
              callbacks: {
                label: function (tooltipItem) {
                  const label = tooltipItem.label || '';
                  const dataValue = tooltipItem.raw; 
                  return `${label}: ${formatTime(dataValue)}`;
                }
              }
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = chartDatasets.initial.labels[index];

              if (!isDrilldown && chartDatasets[label]) {
                isDrilldown = true
                updateChartData(chartDatasets[label]);
              }
              else if (isDrilldown) {
                isDrilldown = false
                updateChartData(chartDatasets.initial)
              }
            }
          }
        }
      });
  } catch (error) {
    console.error('Error updating chart:', error);
  }
}

function updateChartData(dataset) {
  if (productivityChart) {
    productivityChart.data.labels = dataset.labels;
    productivityChart.data.datasets[0].data = dataset.data;
    productivityChart.data.datasets[0].backgroundColor = dataset.colors;
    productivityChart.update();
  }
}
document.querySelector('.calendar').addEventListener('change', (e) => {
  selectedDate = new Date(e.target.value);
  updateWindowInfo();
});
document.querySelector('.calendar').value = formatDate(selectedDate);
updateWindowInfo();
