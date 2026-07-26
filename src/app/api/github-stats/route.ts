import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const token = process.env.GITHUB_PAT;
  const username = "Spidy0519";

  if (!token) {
    console.warn("No GITHUB_PAT found. Returning fallback/empty data.");
    return NextResponse.json({ error: "Missing GITHUB_PAT", fallback: true });
  }

  const query = `
    query {
      user(login: "${username}") {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return NextResponse.json({ error: "Fetch failed", fallback: true });
  }
}
