import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

old_chart = """  // Sales trend chart data
  const salesChartData = [
    { day: "Mon", sales: totalEarnings ? Math.round(totalEarnings * 0.15) : 3200 },
    { day: "Tue", sales: totalEarnings ? Math.round(totalEarnings * 0.22) : 4800 },
    { day: "Wed", sales: totalEarnings ? Math.round(totalEarnings * 0.18) : 2900 },
    { day: "Thu", sales: totalEarnings ? Math.round(totalEarnings * 0.45) : 6900 },
    { day: "Fri", sales: totalEarnings ? Math.round(totalEarnings * 0.35) : 5900 },
    { day: "Sat", sales: totalEarnings ? Math.round(totalEarnings * 0.58) : 7500 },
    { day: "Sun", sales: totalEarnings ? Math.round(totalEarnings * 0.85) : 9800 },
  ];"""

new_chart = """  // Sales trend chart data
  const salesChartData = React.useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailySales = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    orders.forEach(o => {
      const orderDate = new Date(o.createdAt);
      if (orderDate >= startOfWeek) {
        dailySales[orderDate.getDay()] += (o.total || 0);
      }
    });

    return days.map((day, i) => ({ day, sales: dailySales[i] }));
  }, [orders]);"""

if old_chart in content:
    content = content.replace(old_chart, new_chart)
else:
    print("Warning: old chart not found")

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

