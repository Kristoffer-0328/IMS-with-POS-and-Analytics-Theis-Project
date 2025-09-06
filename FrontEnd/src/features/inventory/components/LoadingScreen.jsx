import Loading from '../../../assets/Loading.gif';

const LoadingScreen = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <img src={Loading} alt="Loading..." className="w-24 h-24 mx-auto mb-4" />
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
  