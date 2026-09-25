import re

with open("pages/TrackOrder.tsx", "r") as f:
    content = f.read()

# Make it show cancel reason if order is cancelled
old_status_render = """      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-10 flex flex-col items-center text-center border border-zinc-100 dark:border-zinc-800 mb-12 shadow-sm relative overflow-hidden">
        {order.status === OrderStatus.ON_THE_WAY &&"""

new_status_render = """      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-10 flex flex-col items-center text-center border border-zinc-100 dark:border-zinc-800 mb-12 shadow-sm relative overflow-hidden">
        {order.status === OrderStatus.CANCELLED && (
          <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white py-2 px-4 flex justify-center items-center text-[11px] font-bold tracking-normal shadow-md">
            <span>Cancelled: {(order as any).rejectReason || "No reason provided"}</span>
          </div>
        )}
        {order.status === OrderStatus.ON_THE_WAY &&"""

if old_status_render in content:
    content = content.replace(old_status_render, new_status_render)
else:
    print("Not found!")

with open("pages/TrackOrder.tsx", "w") as f:
    f.write(content)

