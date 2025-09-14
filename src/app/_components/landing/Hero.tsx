import Image from "next/image";

// --- Icons ---
const ArrowForwardIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 ml-2"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const BarcodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 5v14" />
    <path d="M8 5v14" />
    <path d="M12 5v14" />
    <path d="M17 5v14" />
    <path d="M21 5v14" />
  </svg>
);

// --- Hero Component ---
const Hero: React.FC = () => {
  return (
    <section className="min-h-screen bg-gray-50 text-gray-800 flex items-center">
      <div className="container mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-bold px-4 py-2 rounded-full mb-6 shadow-lg border border-blue-200">
              <BarcodeIcon className="w-4 h-4 mr-2" />
              Inventory Management, Reimagined
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Goodbye mistakes,
              <br />
              <span className="text-blue-600">
                hello Smart Picker.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Streamline your warehouse operations with our intelligent picking
              system. Increase accuracy, save time, and manage stock from any
              device, anywhere.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="/login"
                className="flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-xl hover:shadow-2xl transition-all duration-200"
              >
                Get Started Free <ArrowForwardIcon />
              </a>
              <a
                href="/demo"
                className="flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Watch Demo
              </a>
            </div>
          </div>

          {/* Image */}
          <div className="hidden lg:block">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <Image
                  src="https://www.smartpicker.au/cdn-cgi/image/width=1600,format=auto,quality=95/https://smartpicker-images.s3.ap-southeast-1.amazonaws.com/smartpicker-dashboard.png"
                  alt="Smart Picker inventory management software dashboard"
                  className="rounded-2xl shadow-2xl border border-gray-100 transform group-hover:scale-105 transition duration-700"
                  width={800}
                  height={600}
                  priority={true}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
