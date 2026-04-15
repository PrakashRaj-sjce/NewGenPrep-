
import asyncio
from typing import Dict, Any, List
from ai_engine import evaluate_response

# Mock configuration to bypass environment checks if needed
# (Assuming ai_engine uses environment variables or can be mocked)

async def test_rubric_evaluation():
    print("🧪 Testing Rubric Evaluation Logic...")

    question = "Describe a time you resolved a conflict within your team."
    answer = "I had a disagreement with a developer about code style. I scheduled a meeting, listened to their perspective, and we agreed on a compromise using a linter. This improved our team's consistency."
    
    rubric_competencies = [
        {"name": "Communication", "description": "Clarity of thought and expression."},
        {"name": "Conflict Resolution", "description": "Ability to resolve disputes constructively."},
        {"name": "Teamwork", "description": "Collaboration and willingness to compromise."}
    ]

    print(f"\n📝 Question: {question}")
    print(f"🗣️ Answer: {answer}")
    print(f"📊 Rubric: {[c['name'] for c in rubric_competencies]}")

    try:
        # Call the updated create_response function
        result = await evaluate_response(question, answer, rubric_competencies)
        
        print("\n✅ Evaluation Result:")
        print(f"   - Quality Score: {result.get('quality_score')}")
        print(f"   - Relevance Score: {result.get('relevance_score')}")
        print(f"   - Competency Scores: {result.get('competency_scores')}")
        print(f"   - Feedback: {result.get('feedback')}")

        # Verification Assertions
        assert "competency_scores" in result, "❌ 'competency_scores' missing from result"
        assert len(result["competency_scores"]) > 0, "❌ No competency scores returned"
        # We can't strictly assert the values since it calls an AI model (or mock), but structure is key.
        
        print("\n🎉 Test Passed: Structure validates correctly.")

    except Exception as e:
        print(f"\n❌ Test Failed: {e}")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_rubric_evaluation())
