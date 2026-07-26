import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const res = await fetch('https://leetcode-stats-api.herokuapp.com/rahuman19', {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch LeetCode data: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('LeetCode API error:', error);
    // Graceful fallback
    return NextResponse.json({
      status: "error",
      message: "Failed to fetch LeetCode data",
      totalSolved: 350, // fallback placeholder
      easySolved: 120,
      mediumSolved: 200,
      hardSolved: 30,
      totalQuestions: 3000,
      totalEasy: 800,
      totalMedium: 1600,
      totalHard: 600,
      submissionCalendar: {}
    });
  }
}
