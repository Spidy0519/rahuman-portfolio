'use client';

import { useEffect, useState } from 'react';
import { GitHubCalendar } from 'react-github-calendar';

export default function DashboardWidgets() {
  const [leetcodeData, setLeetcodeData] = useState<any>(null);
  const [loadingLeetcode, setLoadingLeetcode] = useState(true);

  useEffect(() => {
    const fetchLeetcode = async () => {
      try {
        const res = await fetch('/api/leetcode-stats');
        const data = await res.json();
        setLeetcodeData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingLeetcode(false);
      }
    };
    fetchLeetcode();
  }, []);

  return (
    <div className="w-full max-w-[420px] flex flex-col gap-6 z-50">
      {/* GitHub Widget */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm tracking-wide text-black m-0 uppercase">GitHub Contributions</h3>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" className="text-black"><path d="M12 0C5.37 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"></path></svg>
        </div>
        
        <div className="p-5">
          <div className="text-[10px] w-full overflow-x-auto hide-scrollbar -ml-1">
            <div className="min-w-[500px] origin-top-left" style={{ transform: 'scale(0.82)' }}>
              <GitHubCalendar 
                username="Spidy0519" 
                colorScheme="light"
                blockSize={12}
                blockMargin={4}
                labels={{
                  totalCount: '{{count}} contributions in the last year',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LeetCode Widget */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm tracking-wide text-black m-0 uppercase">LeetCode Progress</h3>
          {/* Simple LeetCode-like Icon SVG */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>

        {loadingLeetcode ? (
          <div className="p-5 animate-pulse flex flex-col gap-4">
            <div className="flex gap-8">
              <div className="w-1/3 h-16 bg-gray-200 rounded"></div>
              <div className="w-2/3 space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              {/* Left Side - Solved Count */}
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Problems Solved</span>
                <span className="text-5xl font-black text-black leading-none">{leetcodeData?.totalSolved || 350}</span>
              </div>
              
              {/* Right Side - Progress Bars */}
              <div className="flex flex-col gap-2.5 w-1/2 ml-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-700 w-12">Easy</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-[#5cb85c] rounded-full" style={{ width: `${(leetcodeData?.easySolved / leetcodeData?.totalEasy) * 100 || 60}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-700 w-12">Medium</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-[#f0ad4e] rounded-full" style={{ width: `${(leetcodeData?.mediumSolved / leetcodeData?.totalMedium) * 100 || 40}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-700 w-12">Hard</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-[#d9534f] rounded-full" style={{ width: `${(leetcodeData?.hardSolved / leetcodeData?.totalHard) * 100 || 15}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-5 border-t border-gray-100">
               <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-3">Active Streak</span>
               <div className="flex items-end gap-1 h-12">
                  {[2, 5, 3, 7, 4, 8, 6, 9, 5, 7, 10, 4, 8, 12, 14, 11, 8, 6, 9].map((val, i) => (
                    <div key={i} className="flex-1 bg-yellow-400 rounded-t-sm opacity-90" style={{ height: `${(val / 14) * 100}%` }}></div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
