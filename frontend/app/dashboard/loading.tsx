export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-[#0d1117]">
      {/* Sidebar skeleton */}
      <aside className="w-64 bg-[#161b22] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-5 h-5 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400/20" />
            <div className="absolute top-0 left-0 w-10 h-10 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          </div>
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </main>
    </div>
  )
}
