namespace Cjora.SaaS.Sys.Departments;

/// <summary>
/// 部门树安全限制（防 closure/全量扫描爆炸）。
/// </summary>
public sealed class SysDepartmentOptions
{
    public int MaxDepartmentNodes { get; set; } = 20000;
}

