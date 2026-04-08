# Skill: dependency-audit

## Purpose
Proactively check for outdated dependencies in TypeScript/JavaScript and Python projects to ensure the codebase uses current, secure, and performant library versions.

## When to Use
- At the start of any project work
- Before implementing new features
- During code reviews
- When troubleshooting unexpected behavior
- Periodically (monthly recommended)

## Dependency Audit Process

### For TypeScript/JavaScript Projects

1. **Check for outdated packages:**
   ```bash
   npm outdated
   ```

2. **Analyze the output:**
   - **Current**: Version currently installed
   - **Wanted**: Latest version matching semver range in package.json
   - **Latest**: Absolute latest version available
   
3. **Update strategy:**
   - **Patch/Minor updates** (e.g., 3.2.1 → 3.2.3): Safe to update immediately
   - **Major updates** (e.g., 3.x → 4.x): Review breaking changes before updating
   
4. **Update package.json:**
   - Update to latest compatible versions within same major version
   - Document any major version updates that require breaking changes
   
5. **Install and test:**
   ```bash
   npm install
   npm run build
   npm test
   ```

### For Python Projects

1. **Check for outdated packages:**
   ```bash
   pip list --outdated
   # or
   poetry show --outdated
   ```

2. **Update strategy:**
   - Review each package's changelog
   - Update requirements.txt or pyproject.toml
   - Test thoroughly after updates

3. **Install and test:**
   ```bash
   pip install -r requirements.txt
   # or
   poetry install
   python -m pytest
   ```

## Update Guidelines

### Safe to Update Immediately
- Security patches
- Bug fixes (patch versions)
- Minor version updates within same major version
- Documentation improvements

### Requires Careful Review
- Major version changes (breaking changes likely)
- Core framework updates (Next.js, React, Django, FastAPI)
- Build tool updates (Webpack, Vite, TypeScript)
- Testing framework updates

### Consider NOT Updating
- If package is deprecated (find alternative)
- If update requires extensive refactoring
- If project is in production freeze
- If breaking changes affect core functionality

## Communication

When updating dependencies, always:

1. **Inform the user:**
   - List packages being updated
   - Highlight any major version changes
   - Note any breaking changes or required code modifications

2. **Document changes:**
   - Update package.json/requirements.txt
   - Note in commit message or PR description
   - Update README if dependencies change significantly

3. **Test thoroughly:**
   - Run build process
   - Execute test suite
   - Verify core functionality

## Example Workflow

```bash
# 1. Check for updates
npm outdated

# 2. Update package.json with compatible versions
# (edit package.json)

# 3. Install updates
npm install

# 4. Verify build
npm run build

# 5. Run tests
npm test

# 6. Check for remaining issues
npm audit
```

## Red Flags

Watch for these warning signs:
- Packages with known security vulnerabilities
- Packages not updated in 2+ years (may be abandoned)
- Packages with major version jumps (e.g., v2 → v8)
- Conflicting peer dependencies

## Best Practices

1. **Update regularly** - Don't let dependencies get too far behind
2. **Read changelogs** - Understand what's changing before updating
3. **Update incrementally** - Don't update everything at once
4. **Test after each update** - Catch issues early
5. **Keep lockfiles** - Commit package-lock.json or poetry.lock
6. **Use semver ranges wisely** - `^` for minor updates, `~` for patches
7. **Monitor security advisories** - Run `npm audit` or `pip-audit` regularly

## Common Issues and Solutions

### Issue: Peer dependency conflicts
**Solution:** Update peer dependencies first, or use `--legacy-peer-deps` flag temporarily

### Issue: Breaking changes in major updates
**Solution:** Read migration guides, update code incrementally, test thoroughly

### Issue: Build fails after update
**Solution:** Check for TypeScript errors, update type definitions, review breaking changes

### Issue: Tests fail after update
**Solution:** Update test mocks, check for API changes, review test framework updates

## Integration with Development Workflow

- **Before starting work:** Check `npm outdated` or `pip list --outdated`
- **During development:** Update as needed for new features
- **Before PR:** Ensure dependencies are current
- **After PR merge:** Monitor for any issues in production

## Automation Opportunities

Consider setting up:
- Dependabot or Renovate for automated PR creation
- GitHub Actions for automated dependency checks
- Scheduled dependency audits (weekly/monthly)
- Security scanning in CI/CD pipeline

---

**Remember:** Keeping dependencies current is a balance between staying secure/modern and maintaining stability. Always test thoroughly after updates.