import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 PBL(Problem-Based Learning) 전문 교수설계자입니다.
교수자가 제공한 학습목표, 전공, 맥락을 바탕으로
실세계와 연결된 PBL 문제 시나리오를 설계합니다.

다음 형식으로 출력하세요:

## 문제 시나리오: [제목]

### 상황
[실제 상황을 기반으로 한 3-4문단의 시나리오. 학생들이 몰입할 수 있도록 구체적인 인물, 기관, 상황을 포함하세요.]

### 핵심질문 (Driving Questions)
1. [개방형 핵심질문 1]
2. [개방형 핵심질문 2]
3. [개방형 핵심질문 3]

### 주차별 학습 활동 제안
[입력된 주차수에 맞춰 각 주차별 활동을 구체적으로 제안하세요. 각 주차에 PBL 단계(문제 발견, 팀빌딩, 자기주도학습, 중간발표, 최종발표 등)를 매핑하세요.]

### 평가 포인트
[이 PBL에서 중점적으로 평가할 역량과 구체적인 평가 방법을 제안하세요. 과정평가와 결과평가를 모두 포함하세요.]`;

interface RequestBody {
  courseName: string;
  learningObjectives: string;
  field: string;
  studentCount: number;
  weeks: number;
  additionalContext?: string;
  problemType: string;
}

const FIELD_LABELS: Record<string, string> = {
  engineering: "공학",
  medical: "의료/보건",
  business: "경영",
  social: "사회과학",
  humanities: "인문학",
  science: "자연과학",
  education: "교육학",
  arts: "예술/디자인",
};

const PROBLEM_TYPE_LABELS: Record<string, string> = {
  "ic-pbl": "산업체 연계형 (IC-PBL)",
  community: "지역사회 문제해결형",
  academic: "학문 탐구형",
};

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const {
      courseName,
      learningObjectives,
      field,
      studentCount,
      weeks,
      additionalContext,
      problemType,
    } = body;

    if (!courseName || !learningObjectives || !field || !weeks || !problemType) {
      return new Response(
        JSON.stringify({ error: "필수 입력값이 누락되었습니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userMessage = `다음 정보를 바탕으로 PBL 문제 시나리오를 설계해주세요.

- 과목명: ${courseName}
- 학습목표: ${learningObjectives}
- 전공 분야: ${FIELD_LABELS[field] || field}
- 수강 인원: ${studentCount}명
- 운영 주차: ${weeks}주
- 문제 유형: ${PROBLEM_TYPE_LABELS[problemType] || problemType}${additionalContext ? `\n- 추가 맥락: ${additionalContext}` : ""}

위 정보를 기반으로, ${PROBLEM_TYPE_LABELS[problemType] || problemType} 유형에 맞는 실제적이고 구체적인 PBL 문제 시나리오를 설계해주세요.
${weeks}주 운영에 맞는 주차별 활동도 함께 제안해주세요.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "AI 응답 생성 중 오류";
          controller.enqueue(
            encoder.encode(`\n\n---\n오류가 발생했습니다: ${message}`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "요청 처리 중 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
