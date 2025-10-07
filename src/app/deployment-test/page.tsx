import React from "react";

export const metadata = {
  title: "Deployment Test Page",
  description: "Test page to verify deployment is working correctly",
};

export default function DeploymentTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Madiyar1 Deployment Test Successful!
          </h1>
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <p className="text-gray-600 mb-6">
            Congratulations! Madiyar1 Your Next.js application is deployed and
            working correctly.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Deployment Information
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="font-medium mr-2">Framework:</span>
              <span>Next.js 15</span>
            </li>
            <li className="flex items-center">
              <span className="font-medium mr-2">Status:</span>
              <span className="text-green-600 font-medium">Operational</span>
            </li>
            <li className="flex items-center">
              <span className="font-medium mr-2">Time:</span>
              <span>{new Date().toLocaleString()}</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
