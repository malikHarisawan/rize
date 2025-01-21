// Example Data (Replace this with API call if needed)
const data = {
    workHours: 303, // Total minutes worked
    targetHours: 480, // Target in minutes (8 hours)
    breakdown: {
      focus: 239, // Minutes
      meetings: 0,
      breaks: 42,
      other: 21,
    },
    topCategories: [
      { label: "Uncategorized", percentage: 56, time: 148 }, // Minutes
      { label: "Code", percentage: 19, time: 50 },
      { label: "Miscellaneous", percentage: 17, time: 45 },
    ],
  };
  
  // Convert minutes to hours and minutes
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hr ${mins} min`;
  };
  
  // Populate the dashboard with dynamic data
  function populateDashboard(data) {
    // Work Hours and Percent Target
    const workHoursElement = document.getElementById("workHours");
    const percentTargetElement = document.getElementById("percentTarget");
    workHoursElement.textContent = formatTime(data.workHours);
    const percentTarget = Math.round((data.workHours / data.targetHours) * 100);
    percentTargetElement.textContent = `${percentTarget}% of ${formatTime(data.targetHours)}`;
  
    // Breakdown Times
    document.getElementById("focusTime").textContent = formatTime(data.breakdown.focus);
    document.getElementById("meetingsTime").textContent = formatTime(data.breakdown.meetings);
    document.getElementById("breaksTime").textContent = formatTime(data.breakdown.breaks);
    document.getElementById("otherTime").textContent = formatTime(data.breakdown.other);
  
    // Top Categories
    const topCategoriesListElement = document.getElementById("topCategoriesList");
    data.topCategories.forEach((category) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span>${category.percentage}%</span>
        <span>${category.label}</span>
        <span>${formatTime(category.time)}</span>
      `;
      topCategoriesListElement.appendChild(listItem);
    });
  
    // Render Chart
    renderChart(data.breakdown);
  }
  
  // Render Doughnut Chart
  function renderChart(breakdown) {
    const ctx = document.getElementById("productivityChart").getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        
        datasets: [
          {
            data: [
              breakdown.focus,
              breakdown.meetings,
              breakdown.breaks,
              breakdown.other,
            ],
            backgroundColor: ["#00e3e6", "#9e87ff", "#9e87ff", "#757575"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      }
    });
  }
  
  // Initialize Dashboard
  document.addEventListener("DOMContentLoaded", () => {
    populateDashboard(data);
  });
  