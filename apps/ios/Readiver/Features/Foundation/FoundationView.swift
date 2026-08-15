import SwiftUI

struct FoundationView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("READIVER")
                .font(.caption.weight(.bold))
                .tracking(2)
                .foregroundStyle(Color.accentColor)
            Text("Read anything\nat your level.")
                .font(.system(.largeTitle, design: .serif, weight: .medium))
            Text("A calm place for language learners to read the content they care about.")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(32)
        .background(Color(.systemBackground))
    }
}

#Preview {
    FoundationView()
}
