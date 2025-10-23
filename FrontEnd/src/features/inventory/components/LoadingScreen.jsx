const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        {/* Animated CSS Spinner */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
        <p className="text-lg font-semibold text-gray-800 mb-2">Loading...</p>
        <p className="text-sm text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
  
